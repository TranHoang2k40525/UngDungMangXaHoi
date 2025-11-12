import { StyleSheet } from 'react-native';

export const storyStyles = StyleSheet.create({
  storyContainer: {
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#DBDBDB',
  },
  storyItem: {
    alignItems: 'center',
    marginHorizontal: 8,
    width: 72,
  },
  storyAvatarContainer: {
    width: 70,
    height: 70,
    borderRadius: 35,
    padding: 2,
    backgroundColor: '#fff',
  },
  storyAvatarBorder: {
    borderWidth: 2,
    borderColor: '#FF0000',
  },
  storyAvatar: {
    width: '100%',
    height: '100%',
    borderRadius: 33,
  },
  storyName: {
    fontSize: 12,
    marginTop: 4,
    textAlign: 'center',
    color: '#262626',
  },
  plusCircle: {
    width: '100%',
    height: '100%',
    borderRadius: 32,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  plusText: {
    fontSize: 24,
    fontWeight: '600',
    color: '#111827',
  },
});
