// ReportModal.js - Modal for reporting violations
import React, { useState } from "react";
import {
    View,
    Text,
    Modal,
    TouchableOpacity,
    TextInput,
    StyleSheet,
    Alert,
    ScrollView,
    ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { submitReport, REPORT_REASONS } from "../API/ReportAPI";

/**
 * ReportModal Component
 * @param {boolean} visible - Modal visibility
 * @param {function} onClose - Close modal callback
 * @param {string} contentType - Type of content: "post", "comment", "user"
 * @param {number} contentId - ID of the content (post_id, comment_id)
 * @param {number} reportedUserId - ID of the user being reported
 */
const ReportModal = ({
    visible,
    onClose,
    contentType,
    contentId,
    reportedUserId,
}) => {
    const [selectedReason, setSelectedReason] = useState(null);
    const [description, setDescription] = useState("");
    const [loading, setLoading] = useState(false);

    const handleSubmit = async () => {
        if (!selectedReason) {
            Alert.alert("Lỗi", "Vui lòng chọn lý do báo cáo");
            return;
        }

        setLoading(true);
        try {
            await submitReport({
                contentType: contentType,
                contentId: contentId || null,
                reportedUserId: reportedUserId,
                reason: selectedReason,
                description: description.trim() || null,
            });

            Alert.alert(
                "Thành công",
                "Cảm ơn bạn đã báo cáo. Chúng tôi sẽ xem xét trong thời gian sớm nhất.",
                [
                    {
                        text: "OK",
                        onPress: () => {
                            resetForm();
                            onClose();
                        },
                    },
                ]
            );
        } catch (error) {
            Alert.alert(
                "Lỗi",
                error.message || "Không thể gửi báo cáo. Vui lòng thử lại."
            );
        } finally {
            setLoading(false);
        }
    };

    const resetForm = () => {
        setSelectedReason(null);
        setDescription("");
    };

    const handleClose = () => {
        resetForm();
        onClose();
    };

    const reasons = Object.entries(REPORT_REASONS);

    return (
        <Modal
            visible={visible}
            animationType="slide"
            transparent={true}
            onRequestClose={handleClose}
        >
            <View style={styles.overlay}>
                <View style={styles.container}>
                    {/* Header */}
                    <View style={styles.header}>
                        <Text style={styles.title}>Báo cáo Vi phạm</Text>
                        <TouchableOpacity
                            onPress={handleClose}
                            style={styles.closeBtn}
                        >
                            <Ionicons name="close" size={24} color="#000" />
                        </TouchableOpacity>
                    </View>

                    <ScrollView
                        style={styles.content}
                        showsVerticalScrollIndicator={false}
                    >
                        {/* Instructions */}
                        <Text style={styles.instruction}>
                            Vui lòng chọn lý do báo cáo:
                        </Text>

                        {/* Reasons List */}
                        {reasons.map(([key, label]) => (
                            <TouchableOpacity
                                key={key}
                                style={[
                                    styles.reasonItem,
                                    selectedReason === label &&
                                        styles.reasonItemSelected,
                                ]}
                                onPress={() => setSelectedReason(label)}
                            >
                                <View style={styles.radioOuter}>
                                    {selectedReason === label && (
                                        <View style={styles.radioInner} />
                                    )}
                                </View>
                                <Text
                                    style={[
                                        styles.reasonText,
                                        selectedReason === label &&
                                            styles.reasonTextSelected,
                                    ]}
                                >
                                    {label}
                                </Text>
                            </TouchableOpacity>
                        ))}

                        {/* Description (Optional) */}
                        <Text style={styles.label}>
                            Mô tả chi tiết (tùy chọn):
                        </Text>
                        <TextInput
                            style={styles.textArea}
                            placeholder="Nhập thông tin bổ sung về vi phạm..."
                            placeholderTextColor="#999"
                            value={description}
                            onChangeText={setDescription}
                            multiline
                            numberOfLines={4}
                            maxLength={500}
                        />
                        <Text style={styles.charCount}>
                            {description.length}/500
                        </Text>
                    </ScrollView>

                    {/* Footer */}
                    <View style={styles.footer}>
                        <TouchableOpacity
                            style={[styles.button, styles.cancelButton]}
                            onPress={handleClose}
                            disabled={loading}
                        >
                            <Text style={styles.cancelButtonText}>Hủy</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[
                                styles.button,
                                styles.submitButton,
                                loading && styles.buttonDisabled,
                            ]}
                            onPress={handleSubmit}
                            disabled={loading}
                        >
                            {loading ? (
                                <ActivityIndicator color="#fff" />
                            ) : (
                                <Text style={styles.submitButtonText}>
                                    Gửi báo cáo
                                </Text>
                            )}
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        </Modal>
    );
};

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: "rgba(0, 0, 0, 0.5)",
        justifyContent: "flex-end",
    },
    container: {
        backgroundColor: "#fff",
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        maxHeight: "90%",
        paddingBottom: 20,
    },
    header: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        padding: 16,
        borderBottomWidth: 1,
        borderBottomColor: "#e5e5e5",
    },
    title: {
        fontSize: 18,
        fontWeight: "700",
        color: "#000",
    },
    closeBtn: {
        padding: 4,
    },
    content: {
        padding: 16,
    },
    instruction: {
        fontSize: 14,
        color: "#666",
        marginBottom: 16,
    },
    reasonItem: {
        flexDirection: "row",
        alignItems: "center",
        paddingVertical: 12,
        paddingHorizontal: 16,
        marginBottom: 8,
        borderRadius: 12,
        backgroundColor: "#f5f5f5",
        borderWidth: 2,
        borderColor: "transparent",
    },
    reasonItemSelected: {
        backgroundColor: "#e3f2fd",
        borderColor: "#3b82f6",
    },
    radioOuter: {
        width: 20,
        height: 20,
        borderRadius: 10,
        borderWidth: 2,
        borderColor: "#666",
        alignItems: "center",
        justifyContent: "center",
        marginRight: 12,
    },
    radioInner: {
        width: 10,
        height: 10,
        borderRadius: 5,
        backgroundColor: "#3b82f6",
    },
    reasonText: {
        fontSize: 15,
        color: "#333",
        flex: 1,
    },
    reasonTextSelected: {
        color: "#3b82f6",
        fontWeight: "600",
    },
    label: {
        fontSize: 14,
        fontWeight: "600",
        color: "#333",
        marginTop: 20,
        marginBottom: 8,
    },
    textArea: {
        borderWidth: 1,
        borderColor: "#ddd",
        borderRadius: 12,
        padding: 12,
        fontSize: 14,
        color: "#000",
        minHeight: 100,
        textAlignVertical: "top",
    },
    charCount: {
        fontSize: 12,
        color: "#999",
        textAlign: "right",
        marginTop: 4,
    },
    footer: {
        flexDirection: "row",
        padding: 16,
        gap: 12,
        borderTopWidth: 1,
        borderTopColor: "#e5e5e5",
    },
    button: {
        flex: 1,
        paddingVertical: 14,
        borderRadius: 12,
        alignItems: "center",
        justifyContent: "center",
    },
    cancelButton: {
        backgroundColor: "#f5f5f5",
    },
    cancelButtonText: {
        fontSize: 16,
        fontWeight: "600",
        color: "#666",
    },
    submitButton: {
        backgroundColor: "#ef4444",
    },
    submitButtonText: {
        fontSize: 16,
        fontWeight: "600",
        color: "#fff",
    },
    buttonDisabled: {
        opacity: 0.6,
    },
});

export default ReportModal;
