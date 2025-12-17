import React from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
} from "react-native";

export const REACTIONS = [
  { type: 1, emoji: "❤️", label: "Like" },
  { type: 2, emoji: "😍", label: "Love" },
  { type: 3, emoji: "😂", label: "Haha" },
  { type: 4, emoji: "😮", label: "Wow" },
  { type: 5, emoji: "😢", label: "Sad" },
  { type: 6, emoji: "😠", label: "Angry" },
];

export const getReactionEmoji = (type) => {
  const reaction = REACTIONS.find((r) => r.type === type);
  return reaction ? reaction.emoji : "❤️";
};

const ReactionPicker = ({ visible, onSelectReaction, position }) => {
  const scaleAnim = React.useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    if (visible) {
      Animated.spring(scaleAnim, {
        toValue: 1,
        tension: 100,
        friction: 7,
        useNativeDriver: true,
      }).start();
    } else {
      scaleAnim.setValue(0);
    }
  }, [visible]);

  if (!visible) return null;

  return (
    <Animated.View
      style={[
        styles.container,
        position,
        { transform: [{ scale: scaleAnim }] },
      ]}
    >
      <View style={styles.reactionRow}>
        {REACTIONS.map((reaction) => (
          <TouchableOpacity
            key={reaction.type}
            style={styles.reactionButton}
            onPress={() => onSelectReaction(reaction.type)}
            activeOpacity={0.7}
          >
            <Text style={styles.emoji}>{reaction.emoji}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    backgroundColor: "#fff",
    borderRadius: 30,
    paddingHorizontal: 8,
    paddingVertical: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 8,
    zIndex: 1000,
  },
  reactionRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  reactionButton: {
    paddingHorizontal: 6,
    paddingVertical: 4,
    marginHorizontal: 2,
  },
  emoji: {
    fontSize: 32,
  },
});

export default ReactionPicker;