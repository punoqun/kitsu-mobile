import React from 'react';
import PropTypes from 'prop-types';
import { KeyboardAvoidingView, View, Text, ScrollView, Platform, StyleSheet } from 'react-native';
import { connect } from 'react-redux';
import { isEmpty } from 'lodash';
import { Kitsu } from 'kitsu/config/api';
import { defaultAvatar } from 'kitsu/constants/app';
import * as colors from 'kitsu/constants/colors';
import { PostMeta } from 'kitsu/screens/Feed/components/PostMeta';
import { PostTextInput } from 'kitsu/screens/Feed/components/PostTextInput';
import { HeaderButton } from 'kitsu/screens/Feed/components/HeaderButton';
import { GiphyModal } from 'kitsu/screens/Feed/components/GiphyModal';
import { MediaModal } from 'kitsu/screens/Feed/components/MediaModal';
import { feedStreams } from 'kitsu/screens/Feed/feedStreams';
import { CheckBox } from 'react-native-elements';
import { ImageUploader } from 'kitsu/utils/imageuploader';
import { kitsuConfig } from 'kitsu/config/env';
import ImagePicker from 'react-native-image-crop-picker';
import { ImageGrid } from 'kitsu/screens/Feed/components/ImageGrid';
import { GIFImage } from './GIFImage';
import { AdditionalButton } from './AdditionalButton';
import { MediaItem } from './MediaItem';
import { createPostStyles as styles } from './styles';
import { ImageSortModal } from 'kitsu/screens/Feed/components/ImageSortModal';


class CreatePost extends React.PureComponent {
  static propTypes = {
    currentUser: PropTypes.object.isRequired,
    navigation: PropTypes.object.isRequired,
  }

  static navigationOptions = ({ navigation }) => {
    const { params = {} } = navigation.state;

    return {
      title: params.isEditing ? 'Edit Post' : 'Create Post',
      headerTitleStyle: {
        color: '#FFFFFF',
        fontSize: 15,
        flex: 1,
        textAlign: 'center',
      },
      headerLeft: <HeaderButton onPress={() => navigation.goBack(null)} title="Cancel" />,
      headerRight: (
        <HeaderButton
          highlighted
          disabled={params.busy}
          loading={params.busy}
          onPress={params.handlePressPost}
          title={params.isEditing ? 'Edit' : 'Post'}
        />
      ),
    };
  };

  constructor(props) {
    super(props);
    this.uploader = new ImageUploader(kitsuConfig.uploadUrl);
  }

  state = {
    giphyPickerModalIsVisible: false,
    mediaPickerModalIsVisible: false,
    imageSortModalIsVisible: false,
    content: '',
    currentFeed: feedStreams[0],
    error: '',
    gif: null,
    uploads: [],
    media: this.props.navigation.state.params.media || null,
    nsfw: this.props.navigation.state.params.nsfw || false,
    spoiler: this.props.navigation.state.params.spoiler || false,
    spoiledUnit: this.props.navigation.state.params.spoiledUnit || null,
  };

  componentDidMount() {
    const { navigation } = this.props;
    navigation.setParams({
      handlePressPost: this.handlePressPost,
      busy: false,
    });

    // Editing an existing post?
    const { state: { params } } = navigation;
    if (!params.isEditing) { return; }
    const { post } = params;
    this.setState({
      content: post.content,
      spoiler: post.spoiler || false,
      nsfw: post.nsfw || false,
      media: post.media,
    });
  }

  componentWillUnmount() {
    // Abort any uploading if user cancels
    if (this.uploader) {
      this.uploader.abort();
    }
  }

  handleMedia = (media) => {
    this.setState({ media });
    this.handleMediaPickerModal(false);
  };

  handleGiphy = (gif) => {
    this.setState({ gif });
    this.handleGiphyPickerModal(false);
  }

  handleMediaPickerModal = (mediaPickerModalIsVisible) => {
    this.setState({ mediaPickerModalIsVisible });
  }

  handleGiphyPickerModal = (giphyPickerModalIsVisible) => {
    this.setState({ giphyPickerModalIsVisible });
  }

  handleImageSortModal = (imageSortModalIsVisible) => {
    this.setState({ imageSortModalIsVisible });
  }

  handlePressUpload = async () => {
    try {
      const images = await ImagePicker.openPicker({
        mediaType: 'photo',
        multiple: true,
      });

      const uploads = images.map(image => ({
        ...image,
        uri: Platform.select({ ios: image.sourceURL, android: image.path }),
      }));

      this.setState({
        uploads: [...this.state.uploads, ...uploads],
      });
    } catch (e) {
      console.log(e);
    }
  }

  handlePressPost = async () => {
    const { navigation } = this.props;
    const { targetUser } = navigation.state.params;
    const currentUserId = this.props.currentUser.id;
    const { content, currentFeed, gif, media, nsfw, spoiler, spoiledUnit } = this.state;

    if (navigation.state.params.busy) return;

    // Don't allow posting if content and gif is empty
    if (isEmpty(content)) {
      this.setState({ error: 'No content provided!' });
      return;
    }

    navigation.setParams({ busy: true });
    this.setState({ error: '' });

    // Add the gif to the content
    let additionalContent = content;
    if (gif && gif.id) {
      const gifURL = `https://media.giphy.com/media/${gif.id}/giphy.gif`;
      additionalContent += `\n${gifURL}`;
    }

    const mediaData = media ? {
      media: {
        id: media.id,
        type: media.kind || media.type,
      },
    } : {};

    const spoiledData = spoiledUnit ? {
      spoiledUnit: {
        id: spoiledUnit.id,
        type: spoiledUnit.type,
      },
    } : {};

    const targetData = (targetUser && targetUser.id !== currentUserId) ? {
      targetUser: {
        type: 'users',
        id: targetUser.id,
      },
    } : {};

    // Target interest is either 'anime', 'manga', or blank depending
    // on the feed we want to post to.
    const targetInterest = currentFeed.targetInterest || undefined;

    // We can't set target_interest with targetUser
    const targetInterestData = isEmpty(targetData) ? { targetInterest } : {};

    try {
      let post = null;
      if (navigation.state.params.isEditing) {
        post = await Kitsu.update('posts', {
          id: navigation.state.params.post.id,
          content: additionalContent,
          nsfw,
          spoiler,
        });
      } else {
        post = await Kitsu.create('posts', {
          content: additionalContent,
          ...targetInterestData,
          user: {
            type: 'users',
            id: currentUserId,
          },
          ...targetData,
          ...mediaData,
          nsfw,
          spoiler,
          ...spoiledData,
        });
      }

      if (navigation.state.params.onNewPostCreated) {
        navigation.state.params.onNewPostCreated(post);
      }

      navigation.goBack();
    } catch (err) {
      const string = (err && err[0].detail) || 'Failed to create post.';
      this.setState({ error: string });
    }

    navigation.setParams({ busy: false });
  }

  renderMedia() {
    const { media } = this.state;
    const { busy, isEditing, isMediaDisabled } = this.props.navigation.state.params;

    if (media) {
      return (
        <MediaItem
          disabled={busy || isEditing || isMediaDisabled}
          media={media}
          onClear={() => this.setState({ media: null })}
        />
      );
    }

    return (
      <AdditionalButton
        text="Tag Anime or Manga"
        icon="tag"
        color={colors.blue}
        disabled={busy || isEditing}
        onPress={() => this.handleMediaPickerModal(true)}
        style={styles.tagMedia}
      />
    );
  }

  renderGIF() {
    const { gif } = this.state;
    const { busy } = this.props.navigation.state.params;

    if (gif) {
      return (
        <GIFImage
          disabled={busy}
          gif={gif}
          onClear={() => this.setState({ gif: null })}
        />
      );
    }

    return (
      <AdditionalButton
        text="Search & Share Gif"
        icon="plus"
        color={colors.green}
        disabled={busy}
        onPress={() => this.handleGiphyPickerModal(true)}
        style={styles.button}
      />
    );
  }

  renderUpload() {
    const { uploads } = this.state;
    const { busy } = this.props.navigation.state.params;

    if (!isEmpty(uploads)) {
      return (
        <View style={styles.uploadContainer}>
          <ImageGrid
            images={uploads.map(u => u.uri)}
            compact
            onImageTapped={() => this.handleImageSortModal(true)}
          />
        </View>
      );
    }

    return (
      <AdditionalButton
        text="Upload Images"
        icon="upload"
        color={colors.red}
        disabled={busy}
        onPress={this.handlePressUpload}
        style={styles.button}
      />
    );
  }

  render() {
    const { currentUser, navigation } = this.props;
    const {
      error,
      currentFeed,
      content,
      giphyPickerModalIsVisible,
      mediaPickerModalIsVisible,
      imageSortModalIsVisible,
      nsfw,
      spoiler,
      gif,
      uploads,
    } = this.state;
    const { targetUser, isEditing } = navigation.state.params;

    const isValidTargetUser = (targetUser && targetUser.id !== currentUser.id && targetUser.name);
    const placeholder = isValidTargetUser ? `Write something to ${targetUser.name}` : 'Write something....';

    return (
      <KeyboardAvoidingView
        behavior="padding"
        style={styles.main}
      >
        <View style={styles.flex}>
          { /* Error */}
          {!isEmpty(error) &&
            <View style={styles.errorContainer}>
              <Text style={{ color: 'white' }}>
                An Error Occurred. {error}
              </Text>
            </View>
          }
          <PostMeta
            avatar={(currentUser.avatar && currentUser.avatar.medium) || defaultAvatar}
            author={currentUser.name}
            feedTitle={currentFeed.title}
            targetName={(isValidTargetUser && targetUser.name) || ''}
          />
          <ScrollView style={styles.flex} >
            <PostTextInput
              inputRef={(el) => { this.postTextInput = el; }}
              multiline
              onChangeText={c => this.setState({ content: c })}
              value={content}
              placeholder={placeholder}
              placeholderTextColor={colors.grey}
              autoCorrect
              autoFocus
              autoCapitalize="sentences"
              underlineColorAndroid="transparent"
              blurOnSubmit={false}
            />
            <View style={styles.checkboxContainer}>
              <CheckBox
                title="NSFW"
                containerStyle={styles.checkbox}
                checkedColor={colors.green}
                checked={nsfw}
                checkedIcon="check-circle"
                uncheckedIcon="circle-thin"
                onPress={() => this.setState({ nsfw: !nsfw })}
              />
              <CheckBox
                title="Spoiler"
                containerStyle={styles.checkbox}
                checkedColor={colors.green}
                checked={spoiler}
                checkedIcon="check-circle"
                uncheckedIcon="circle-thin"
                onPress={() => this.setState({ spoiler: !spoiler })}
              />
            </View>
            <View>
              { this.renderMedia() }

              {/* Don't allow gif selection if user is uploading images */}
              { isEmpty(uploads) && this.renderGIF() }

              {/* Only allow uploading if user is not editing post or gif is not selected */}
              { !gif && !isEditing &&
                this.renderUpload()
              }
            </View>
          </ScrollView>
        </View>
        <ImageSortModal
          images={uploads}
          visible={imageSortModalIsVisible}
          onCancelPress={() => this.handleImageSortModal(false)}
          onAddPress={this.handlePressUpload}
        />
        <GiphyModal
          visible={giphyPickerModalIsVisible}
          onCancelPress={() => this.handleGiphyPickerModal(false)}
          onGifSelect={this.handleGiphy}
        />
        <MediaModal
          visible={mediaPickerModalIsVisible}
          onCancelPress={() => this.handleMediaPickerModal(false)}
          onMediaSelect={this.handleMedia}
        />
      </KeyboardAvoidingView>
    );
  }
}

const mapStateToProps = ({ user }) => {
  const { currentUser } = user;
  return { currentUser };
};

export default connect(mapStateToProps)(CreatePost);
