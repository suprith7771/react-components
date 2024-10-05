  const renderSearchBar = () => {
    return (
      <View style={{ position: 'relative', width: 300 }}>
        {/* Transparent Pressable over entire ScrollView, but excluding tags */}
        <Pressable
          style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
          onPress={() => textInputRef.current?.focus()} // Focus the TextInput when pressing anywhere
        />

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
      </View>
    );
  };
