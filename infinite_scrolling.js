import {
  View,
  ScrollView,
  Platform,
  KeyboardAvoidingView,
  FlatList,
  LayoutChangeEvent,
} from 'react-native';
import { Searchbar } from 'react-native-paper';
import i18n from '../../../../locales/i18n';
import { styles } from '../style';
import { useState, useEffect, useCallback, useRef } from 'react';
import { SearchIcon } from '../../../../assets/svgIcons';
import React from 'react';
import { useStoreActions } from '../../../store';
import { ScheduleTaskComponent } from './UnScheduledTask';
import { TASKS_PER_PAGE_CLOCKIN, VISIBLE_PAGES_LIMIT } from '../../../constants/constants';

interface TaskSelectionPaginatedProps {
  properties: any;
  onSelect: (selectedProject: any) => void;
  toggleModal: () => void;
  rowTitle?: string;
}

export const TaskSelectionPaginated = ({
  properties,
  onSelect,
  toggleModal,
  rowTitle,
}: TaskSelectionPaginatedProps) => {
  const { fetchTasksPaginated } = useStoreActions((actions) => actions.project);
  const setSnackBarProps = useStoreActions((store) => store.timesheet.setSnackbarProps);

  const [filteredTasks, setFilteredTasks] = useState<any[]>([]);
  const [searchString, setSearchString] = useState('');
  const [pageNumber, setPageNumber] = useState(0);
  const [prevPageNumber, setPrevPageNumber] = useState(-1);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [removedTasksFlag, setRemovedTasksFlag] = useState(false);

  const [keyboardViewHeight, setKeyboardViewHeight] = useState(0); // State for KeyboardAvoidingView height
  const flatListRef = useRef<FlatList>(null); // FlatList reference to control scrolling
  const viewRef = useRef<View>(null); // Ref for the wrapping View to measure height

  const [prevScrollHeight, setPrevScrollHeight] = useState(0); // Store previous scroll offset
  const [totalScrollHeight, setTotalScrollHeight] = useState<number>(0);
  const [pagesHeights, setPageHeights] = useState<number[]>([]);

  // Function to programmatically scroll up by 600 pixels
  const scrollUpBy = () => {
    console.log(
      'prevScrollHeight',
      prevScrollHeight,
      totalScrollHeight,
      prevScrollHeight - keyboardViewHeight
    );

    if (flatListRef.current) {
      flatListRef.current.scrollToOffset({
        offset: Math.max(0, prevScrollHeight - keyboardViewHeight), // Ensure it doesn't go negative
        animated: true,
      });
    }
  };

  const handleKeyboardAvoidingViewLayout = () => {
    // This callback will be triggered after the component's layout is calculated
    console.log(viewRef, viewRef.current);

    if (viewRef.current) {
      viewRef.current.measure((x, y, width, height, pageX, pageY) => {
        console.log('Measured height:', height);
        setKeyboardViewHeight(height); // Set the view height using ref
      });
    }
  };

  const loadTasks = useCallback(async () => {
    if (loading) return;

    try {
      setLoading(true);

      const newTasks = await fetchTasksPaginated({
        pageNumber: pageNumber,
        searchString: searchString,
      });

      if (pageNumber > prevPageNumber) {
        // Number of tasks in next fetch will be 0
        if (newTasks.length < TASKS_PER_PAGE_CLOCKIN) setHasMore(false);
        // let updatedTasks = filteredTasks;
        // if (pagesHeights.length >= VISIBLE_PAGES_LIMIT) {
        //   updatedTasks = filteredTasks.slice(TASKS_PER_PAGE_CLOCKIN); // Remove the first page
        // }
        setPrevScrollHeight(totalScrollHeight);
        // setFilteredTasks([...updatedTasks, ...newTasks]);
        setFilteredTasks((prevTasks) => [...prevTasks, ...newTasks]);
      } else {
        setHasMore(false);
        setFilteredTasks((prevTasks) => {
          let updatedTasks = prevTasks.slice(0, TASKS_PER_PAGE_CLOCKIN); // Remove bottom tasks
          updatedTasks = [...newTasks, ...updatedTasks]; // Add new tasks at the top
          return updatedTasks;
        });

        // Scroll to the top after fetching previous tasks
        // if (scrollViewRef.current) {
        //   scrollViewRef.current.scrollTo({ y: 0, animated: false });
        // }
      }
    } catch (error) {
      setSnackBarProps({
        visible: true,
        message: 'Failed to fetch tasks',
        color: 'red',
      });
    } finally {
      setLoading(false);
    }
  }, [pageNumber, prevPageNumber, searchString, hasMore, loading]);

  useEffect(() => {
    if (totalScrollHeight === 0 || filteredTasks.length === 0) return;
    if (removedTasksFlag) {
      scrollUpBy();
      setRemovedTasksFlag(false);
      return;
    }
    if (pageNumber > prevPageNumber) {
      const presentPageHeights = [...pagesHeights, totalScrollHeight - prevScrollHeight];
      if (presentPageHeights.length > VISIBLE_PAGES_LIMIT) {
        setFilteredTasks(filteredTasks.slice(TASKS_PER_PAGE_CLOCKIN));
        setRemovedTasksFlag(true);
        const firstOne = presentPageHeights.shift();
        setPrevScrollHeight(prevScrollHeight - firstOne!);
      }
      setPageHeights(presentPageHeights);
    } else {
    }
  }, [totalScrollHeight]);

  useEffect(() => {
    loadTasks();
  }, [pageNumber]);

  useEffect(() => {
    if (prevPageNumber === -1) return;
    async function fetch() {
      await loadTasks();
    }
    setPageNumber(0);
    setFilteredTasks([]);
    setHasMore(true);
    fetch();
  }, [searchString]);

  const handleContentSizeChange = (contentWidth: number, contentHeight: number) => {
    console.log('contentHeight', contentHeight);

    setTotalScrollHeight(contentHeight);
  };

  let debounceTimeout: any = null;

  const handleScroll = async ({ nativeEvent }: { nativeEvent: any }) => {
    const { contentOffset, layoutMeasurement, contentSize } = nativeEvent;

    if (debounceTimeout) {
      clearTimeout(debounceTimeout);
    }

    debounceTimeout = setTimeout(() => {
      if (isCloseToBottom({ layoutMeasurement, contentOffset, contentSize })) {
        if (!hasMore) return;
        else if (pageNumber > prevPageNumber) {
          setPrevPageNumber((prevPage) => prevPage + 1);
          setPageNumber((prevPage) => prevPage + 1);
        } else {
          setPrevPageNumber((prevPage) => prevPage + VISIBLE_PAGES_LIMIT - 1);
          setPageNumber((prevPage) => prevPage + VISIBLE_PAGES_LIMIT + 1);
        }
      } else if (isCloseToTop({ layoutMeasurement, contentOffset })) {
        if (pageNumber === 0 || pageNumber <= VISIBLE_PAGES_LIMIT) return;
        else if (pageNumber < prevPageNumber) {
          setPrevPageNumber((prevPage) => prevPage - 1);
          setPageNumber((prevPage) => prevPage - 1);
        } else {
          setPrevPageNumber((prevPage) => prevPage - VISIBLE_PAGES_LIMIT + 1);
          setPageNumber((prevPage) => prevPage - VISIBLE_PAGES_LIMIT - 1);
        }
      }
    }, 200);
  };

  const isCloseToBottom = ({
    layoutMeasurement,
    contentOffset,
    contentSize,
  }: {
    layoutMeasurement: { height: number };
    contentOffset: { y: number };
    contentSize: { height: number };
  }) => {
    const paddingToBottom = 20;
    return layoutMeasurement.height + contentOffset.y >= contentSize.height - paddingToBottom;
  };

  const isCloseToTop = ({
    layoutMeasurement,
    contentOffset,
  }: {
    layoutMeasurement: { height: number };
    contentOffset: { y: number };
  }) => {
    return contentOffset.y <= 20;
  };

  console.log(pagesHeights, filteredTasks);

  return (
    <View style={{ display: 'flex', flex: 1 }}>
      <View style={styles.searchContainer}>
        <Searchbar
          icon={() => <SearchIcon />}
          inputStyle={{ color: 'black', minHeight: 0 }}
          allowFontScaling={false}
          style={styles.innerSearchContainer}
          placeholder={i18n.t(properties.placeHolderTitle)}
          placeholderTextColor={'#98A2B3'}
          onChangeText={(text) => {
            setSearchString(text);
          }}
          value={searchString}
        />
      </View>
      {/* <View ref={viewRef} onLayout={handleKeyboardAvoidingViewLayout}> */}
      <KeyboardAvoidingView
        // ref={viewRef}
        behavior={Platform.OS === 'ios' || Platform.OS === 'web' ? 'padding' : 'height'}
        style={{ flex: 1, height: '100%' }}
        keyboardVerticalOffset={140}
        onLayout={(event) => {
          const { height } = event.nativeEvent.layout; // The layout event provides height
          console.log('KeyboardAvoidingView height:', height);
          setKeyboardViewHeight(height); // Set the captured height in state
        }}
      >
        <FlatList
          ref={flatListRef} // Reference to control FlatList scrolling
          data={filteredTasks}
          renderItem={({ item, index }) => (
            <ScheduleTaskComponent
              data={item}
              key={index}
              onSelect={onSelect}
              toggleModal={toggleModal}
              last={index === filteredTasks.length - 1}
            />
          )}
          keyExtractor={(item, index) => index.toString()} // Ensure unique keys for each item
          onScroll={handleScroll} // Handle scroll event
          onContentSizeChange={handleContentSizeChange}
          scrollEventThrottle={16} // Set scroll throttle
          contentContainerStyle={{ padding: 24 }} // Style for inner container
          ListFooterComponent={() => <View style={{ marginBottom: 20 }} />} // Footer space if needed
        />
      </KeyboardAvoidingView>
      {/* </View> */}
    </View>
  );
};
