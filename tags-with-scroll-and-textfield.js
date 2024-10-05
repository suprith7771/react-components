import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  SafeAreaView,
  Pressable,
  ScrollView,
} from 'react-native';
import { styles } from './style';
import { apiGetAllCrew, apiGetAllUsersV1 } from '../../../api';
import { useStoreActions, useStoreState } from '../../../store';
import {
  BackArrowIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  CloseIcon,
  MultipleUsersIcon,
  TickIcon,
} from '../../../../assets/svgIcons';
import CustomText from '../../../components/CustomText';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../../../App';
import { filterAndSortWorkersAndCrews, handleCrewsActivationDeactivation } from './utils';
import { renderAvatar } from '../components/RenderAvatar';

const GroupCreationHeader = () => {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  const userId = useStoreState((state) => state?.info?.info?.user?.id);
  const { setIsCreatingGroup, setGroupCreationData } = useStoreActions((actions) => actions.chat);

  const [loading, setLoading] = useState<boolean>(false);
  const [unselectedCrews, setUnselectedCrews] = useState<Record<string, any>>({});
  const [unselectedWorkers, setUnselectedWorkers] = useState<Record<string, any>>({});
  const [selectedWorkers, setSelectedWorkers] = useState<Record<string, any>>({});
  const [selectedCrews, setSelectedCrews] = useState<Record<string, any>>({});
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [filteredArray, setFilteredArray] = useState<any[]>([]);
  const [crewOpenState, setCrewOpenState] = useState<Record<string, boolean>>({});
  const [selectedCrewWorkersArray, setSelectedCrewWorkersArray] = useState<any[]>([]);

  const [needsActivationDeactivation, setNeedsActivationDeactivation] = useState(false);

  // Fetch crews and workers
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const resultCrews: any = await apiGetAllCrew();
        const resultWorkers: any = await apiGetAllUsersV1();

        let crewsMap = resultCrews?.data
          ?.filter((crew: any) => crew.active !== false)
          .reduce((acc: Record<string, any>, crew: any) => {
            const activeCrewMembers = crew.crew_members
              .filter(
                (crew_member: any) =>
                  crew_member.company_user.active === true && crew_member.company_user.id !== userId
              )
              .map((crew_member: any) => crew_member.company_user);

            // Only include the crew if it has active crew members
            if (activeCrewMembers.length > 0) {
              acc[crew.id] = {
                crew_members: activeCrewMembers,
                name: crew.name,
              };
            }
            return acc;
          }, {});

        console.log('crewsMap: ', crewsMap, typeof userId);

        const workersMap = resultWorkers?.data
          ?.filter((worker: any) => worker.active !== false && worker.id !== userId)
          .reduce((acc: Record<string, any>, worker: any) => {
            acc[worker.id] = {
              ...worker,
              name: worker.user.first_name + ' ' + worker.user.last_name,
            };
            return acc;
          }, {});

        setUnselectedCrews(crewsMap);
        setUnselectedWorkers(workersMap);
        setLoading(false);
      } catch (err) {
        console.error('Error fetching crews:', err);
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  useEffect(() => {
    filterAndSortWorkersAndCrews(
      selectedCrews,
      unselectedCrews,
      selectedWorkers,
      unselectedWorkers,
      searchQuery,
      setFilteredArray
    );
  }, [searchQuery, unselectedCrews, unselectedWorkers]);

  useEffect(() => {
    setGroupCreationData({
      isProjectGroup: false,
      selectedWorkers: selectedWorkers,
      selectedCrewWorkersArray: selectedCrewWorkersArray,
    });
  }, [selectedWorkers]);

  const toggleCrewOpen = (crewId: string) => {
    setCrewOpenState((prevState) => ({
      ...prevState,
      [crewId]: !prevState[crewId],
    }));
  };

  useEffect(() => {
    if (needsActivationDeactivation) {
      handleCrewsActivationDeactivation(
        selectedCrews,
        unselectedCrews,
        selectedWorkers,
        unselectedWorkers,
        setSelectedCrews,
        setUnselectedCrews,
        setSelectedCrewWorkersArray
      );

      // Reset the flag after handling the activation/deactivation
      setNeedsActivationDeactivation(false);
    }
  }, [
    needsActivationDeactivation,
    selectedCrews,
    unselectedCrews,
    selectedWorkers,
    unselectedWorkers,
  ]);

  function addSelection(type: 'worker' | 'crew', id: string) {
    if (type === 'worker') {
      setUnselectedWorkers((prevUnselectedWorkers) => {
        const { [id]: addedWorker, ...remainingWorkers } = prevUnselectedWorkers;

        setSelectedWorkers((prevSelectedWorkers) => ({
          ...prevSelectedWorkers,
          [id]: addedWorker,
        }));
        setSelectedCrewWorkersArray((prevSelectedCrewWorkers) => [
          ...prevSelectedCrewWorkers,
          {
            type: 'worker',
            ...addedWorker,
          },
        ]);
        return remainingWorkers;
      });
    } else if (type === 'crew') {
      setUnselectedCrews((prevUnselectedCrews) => {
        const { [id]: addedCrew, ...remainingCrews } = prevUnselectedCrews;

        addedCrew.crew_members.forEach((worker: any) => {
          const workerId = worker.id;
          if (!selectedWorkers.hasOwnProperty(workerId)) {
            setUnselectedWorkers((prevUnselectedWorkers) => {
              const { [workerId]: addedWorker, ...remainingWorkers } = prevUnselectedWorkers;

              setSelectedWorkers((prevSelectedWorkers) => ({
                ...prevSelectedWorkers,
                [workerId]: addedWorker,
              }));
              return remainingWorkers;
            });
          }
        });

        setSelectedCrews((prevSelectedCrews) => ({
          ...prevSelectedCrews,
          [id]: addedCrew,
        }));

        setSelectedCrewWorkersArray((prevSelectedCrewWorkers) => [
          ...prevSelectedCrewWorkers,
          { ...addedCrew, type: 'crew', id: id },
        ]);

        return remainingCrews;
      });
    }
    setNeedsActivationDeactivation(true);
  }

  function removeSelection(type: 'worker' | 'crew', id: string) {
    if (type === 'worker') {
      setSelectedWorkers((prevSelectedWorkers) => {
        const { [id]: removedWorker, ...remainingWorkers } = prevSelectedWorkers;

        setUnselectedWorkers((prevUnselectedWorkers) => ({
          ...prevUnselectedWorkers,
          [id]: removedWorker,
        }));
        setSelectedCrewWorkersArray((prevSelectedCrewWorkers) =>
          prevSelectedCrewWorkers.filter((worker) => worker.id !== id)
        );
        return remainingWorkers;
      });
    } else if (type === 'crew') {
      setSelectedCrews((prevSelectedCrews) => {
        const { [id]: removedCrew, ...remainingCrews } = prevSelectedCrews;

        removedCrew.crew_members.forEach((worker: any) => {
          const workerId = worker.id;
          if (selectedWorkers.hasOwnProperty(workerId)) {
            setSelectedWorkers((prevSelectedWorkers) => {
              const { [workerId]: removedWorker, ...remainingWorkers } = prevSelectedWorkers;

              setUnselectedWorkers((prevUnselectedWorkers) => ({
                ...prevUnselectedWorkers,
                [workerId]: removedWorker,
              }));
              return remainingWorkers;
            });
          }
        });

        setUnselectedCrews((prevUnselectedCrews) => ({
          ...prevUnselectedCrews,
          [id]: removedCrew,
        }));

        setSelectedCrewWorkersArray((prevSelectedCrewWorkers) =>
          prevSelectedCrewWorkers.filter(
            (crewOrWorker) =>
              crewOrWorker.id !== id &&
              !removedCrew.crew_members.some((crewMember: any) => crewMember.id === crewOrWorker.id)
          )
        );
        return remainingCrews;
      });
    }
    setNeedsActivationDeactivation(true);
  }
  const scrollViewRef = useRef<ScrollView>(null);
  const textInputRef = useRef<any>(null);
  // Function to trigger scroll to the right when tags overflow
  const handleContentSizeChange = () => {
    if (scrollViewRef.current) {
      scrollViewRef.current.scrollToEnd({ animated: true });
    }
  };

  const renderSearchBar = () => {
    return (
      <ScrollView
        ref={scrollViewRef}
        onContentSizeChange={handleContentSizeChange} // Automatically scroll to end
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ flexDirection: 'row', alignItems: 'center' }}
        bounces={false}
        style={{ width: 300, padding: 0 }}
      >
        {selectedCrewWorkersArray.map((data, index) => (
          <View key={data.id} style={styles.tagContainer}>
            {data.type === 'crew' ? (
              <>
                <CustomText>{renderAvatar(16, data.name, null, false, 12)}</CustomText>
                <CustomText>
                  {data.name.length > 10 ? `${data.name.slice(0, 10)}` : data.name}
                </CustomText>
                <Pressable
                  onPress={(e) => {
                    e.stopPropagation(); // Prevent event bubbling
                    removeSelection('crew', data.id); // Ensure proper state update
                  }}
                >
                  <CloseIcon strokeColor="black" />
                </Pressable>
              </>
            ) : (
              <>
                <CustomText>{renderAvatar(16, data.name)}</CustomText>
                <CustomText>
                  {data.name.length > 10 ? `${data.name.slice(0, 10)}` : data.name}
                </CustomText>
                <Pressable
                  onPress={(e) => {
                    e.stopPropagation(); // Prevent event bubbling
                    removeSelection('worker', data.id); // Ensure proper state update
                  }}
                >
                  <CloseIcon strokeColor="black" />
                </Pressable>
              </>
            )}
          </View>
        ))}

        {/* Ensure the TextInput takes up the remaining space */}
        <View style={{ flexGrow: 1 }}>
          <TextInput
            ref={textInputRef} // Attach ref to focus the input
            style={{
              width: '100%',
              minWidth: 50, // Ensure it doesn't shrink too small
            }}
            placeholder="Search"
            value={searchQuery}
            onChangeText={(text) => setSearchQuery(text)}
          />
        </View>
      </ScrollView>
    );
  };

  if (loading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={{ display: 'flex', flexDirection: 'row', alignItems: 'center' }}>
        <Pressable
          onPress={() => {
            setIsCreatingGroup(false);
            navigation.goBack();
          }}
          style={styles.backButton}
        >
          <BackArrowIcon strokeColor="black" />
        </Pressable>

        <View style={styles.inputWrapper}>{renderSearchBar()}</View>
      </View>

      <FlatList
        data={filteredArray}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => {
          if (item.type === 'crew') {
            const isSelected = selectedCrews.hasOwnProperty(item.id);
            return (
              <>
                {/* Crew List Item */}
                <Pressable
                  style={[
                    styles.crewMenuItem,
                    { width: '100%' },
                    isSelected && { backgroundColor: '#F9FAFB' },
                  ]}
                  onPress={(e) => {
                    e.stopPropagation(); // Prevent parent MenuItem click from being triggered
                    isSelected ? removeSelection('crew', item.id) : addSelection('crew', item.id);
                  }}
                >
                  <View style={[styles.crewContainer]}>
                    <View style={styles.crewHeader}>
                      <MultipleUsersIcon width={20} height={20} />
                      <Pressable
                        onPress={(e) => {
                          e.stopPropagation();
                          toggleCrewOpen(item.id); // Control crew open state
                        }}
                        style={styles.toggleIcon}
                      >
                        <CustomText style={styles.crewName}>{item.name}</CustomText>
                        {crewOpenState[item.id] ? (
                          <ChevronUpIcon width={20} height={20} color="#808080" />
                        ) : (
                          <ChevronDownIcon width={20} height={20} color="#808080" />
                        )}
                      </Pressable>
                    </View>
                    {isSelected && <TickIcon width={20} height={20} />}
                  </View>
                </Pressable>

                {/* Crew Members Nested */}
                {crewOpenState[item.id] &&
                  item.crew_members.map((worker: any) => {
                    const isWorkerSelected = selectedWorkers.hasOwnProperty(worker.id);

                    return (
                      <Pressable
                        key={worker.id}
                        onPress={(e) => {
                          e.stopPropagation();
                          isWorkerSelected
                            ? removeSelection('worker', worker.id)
                            : addSelection('worker', worker.id);
                        }}
                        style={[
                          styles.memberContainer,
                          { backgroundColor: isWorkerSelected ? '#F9FAFB' : 'transparent' },
                        ]}
                      >
                        <View style={styles.workerItem}>
                          {renderAvatar(
                            24,
                            worker.user.first_name + ' ' + worker.user.last_name,
                            null
                          )}
                          <Text style={styles.workerName}>
                            {worker.user.first_name + ' ' + worker.user.last_name}
                          </Text>
                          {isWorkerSelected && <TickIcon width={20} height={20} />}
                        </View>
                      </Pressable>
                    );
                  })}
              </>
            );
          } else {
            const isSelected = selectedWorkers.hasOwnProperty(item.id);

            // Handle non-crew options
            return (
              <Pressable
                style={styles.workerItemContainer}
                onPress={(e) => {
                  e.stopPropagation();
                  isSelected ? removeSelection('worker', item.id) : addSelection('worker', item.id);
                }}
              >
                <View style={styles.workerContent}>
                  <View style={styles.workerHeader}>
                    {renderAvatar(24, item.name, null)}
                    <Text style={styles.workerName}>{item.name}</Text>
                  </View>
                  {isSelected && <TickIcon width={20} height={20} />}
                </View>
              </Pressable>
            );
          }
        }}
      />
    </SafeAreaView>
  );
};

export default GroupCreationHeader;
