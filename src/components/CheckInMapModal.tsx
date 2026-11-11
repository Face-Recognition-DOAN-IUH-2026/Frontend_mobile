"use strict";

import React, { useCallback, useEffect, useState } from "react";
import { StyleSheet, View, ViewStyle } from "react-native";
import MapView, { Marker, Circle } from "react-native-maps";
import * as Location from "expo-location";
import { Alert } from "react-native";
import { Button, Card, Text, useTheme } from "react-native-paper";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { scheduleApi } from "../api/schedule";

const EARTH_RADIUS_METERS = 6371e3;
const GPS_TOLERANCE_METERS = 15;

interface Coord {
  latitude: number;
  longitude: number;
}

interface Props {
  visible: boolean;
  assignmentId: string;
  zoneName: string;
  onClose: () => void;
  onSuccess: () => void;
}

function haversine(a: Coord, b: Coord): number {
  const phi1 = (a.latitude * Math.PI) / 180;
  const phi2 = (b.latitude * Math.PI) / 180;
  const dPhi = ((b.latitude - a.latitude) * Math.PI) / 180;
  const dLambda = ((b.longitude - a.longitude) * Math.PI) / 180;
  const h =
    Math.sin(dPhi / 2) ** 2 + Math.cos(phi1) * Math.cos(phi2) * Math.sin(dLambda / 2) ** 2;
  return EARTH_RADIUS_METERS * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
}

export default function CheckInMapModal({ visible, assignmentId, zoneName, onClose, onSuccess }: Props) {
  const theme = useTheme();
  const [center, setCenter] = useState<Coord | null>(null);
  const [radiusMeters, setRadiusMeters] = useState<number | null>(null);
  const [user, setUser] = useState<Coord | null>(null);
  const [loadingGeo, setLoadingGeo] = useState(false);
  const [checking, setChecking] = useState(false);
  const [status, setStatus] = useState<{ allowed: boolean; distance: number | null; radius: number | null } | null>(null);

  /* Hoạt ảnh vòng tròn nhấp nháy xung quanh ghim GPS nhân viên khi đã có vị trí. */
  const [pulse, setPulse] = useState(0);

  useEffect(() => {
    if (!user) return;
    let t = 0;
    const id = setInterval(() => {
      t = (t + 0.08) % 2.08;
      setPulse(t <= 1 ? t : 2.08 - t); // 0 → 1 → 0
    }, 40);
    return () => clearInterval(id);
  }, [user]);

  useEffect(() => {
    if (visible) loadGeofence();
    else {
      setUser(null);
      setStatus(null);
    }
  }, [visible]);

  const loadGeofence = async () => {
    setLoadingGeo(true);
    try {
      const data: any = await scheduleApi.getAssignmentGeofence(assignmentId);
      setCenter(data.latitude != null && data.longitude != null ? { latitude: data.latitude, longitude: data.longitude } : null);
      setRadiusMeters(data.radiusMeters ?? null);
    } catch (err) {
      Alert.alert("Lỗi", "Không tải được khu vực kiểm tra");
    } finally {
      setLoadingGeo(false);
    }
  };

  const requestLocation = useCallback((): Promise<Coord | null> => {
    return new Promise((resolve) => {
      Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.BestForNavigation })
        .then((pos) => resolve({ latitude: pos.coords.latitude, longitude: pos.coords.longitude }))
        .catch(() => resolve(null));
    });
  }, []);

  const evaluate = () => {
    if (!center || !radiusMeters || !user) {
      setStatus(null);
      return;
    }
    const distance = haversine(user, center);
    const effective = radiusMeters + GPS_TOLERANCE_METERS;
    setStatus({ allowed: distance <= effective, distance, radius: radiusMeters });
  };

  const doCheckIn = async () => {
    if (!status?.allowed || !user) return;
    setChecking(true);
    try {
      await scheduleApi.checkIn(assignmentId, user.latitude, user.longitude, "mobile");
      await onSuccess();
      onClose();
    } catch (err: any) {
      Alert.alert("Lỗi", err?.response?.data?.error || "Check-in thất bại");
    } finally {
      setChecking(false);
    }
  };

  if (!visible) return null;

  const isDark = theme.colors.background === "#0b1120" || theme.colors.background === "#0f172a";
  const mapStyle: ViewStyle = { flex: 1 };
  const containerStyle: ViewStyle = { flex: 1 };

  return (
    <SafeAreaView style={containerStyle}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Xác nhận vị trí điểm danh</Text>
        <Button icon="close" mode="text" onPress={onClose}>Đóng</Button>
      </View>
      <Text style={styles.subtitle}>{zoneName}</Text>
      <View style={styles.mapContainer}>
        {loadingGeo ? (
          <View style={styles.loadingMap}>
            <MaterialCommunityIcons name="map-marker-outline" size={36} color={theme.colors.onSurfaceVariant} />
            <Text style={styles.caption}>Đang tải khu vực...</Text>
          </View>
        ) : !center ? (
          <View style={styles.loadingMap}>
            <Text style={styles.caption}>Khu vực chưa có toạ độ</Text>
          </View>
        ) : (
          <MapView style={mapStyle} initialRegion={{ latitude: center.latitude, longitude: center.longitude, latitudeDelta: 0.01, longitudeDelta: 0.01 }}>
            {radiusMeters != null ? <Circle center={center} radius={radiusMeters} fillColor="rgba(99,102,241,0.15)" strokeColor="#6366f1" strokeWidth={2} /> : null}
            <Marker coordinate={center} title="Phòng thi" />
            {user ? (
              <>
                <Circle
                  center={{ latitude: user.latitude, longitude: user.longitude }}
                  radius={22 + pulse * 48}
                  fillColor={status?.allowed
                    ? `rgba(16,185,129,${0.35 - pulse * 0.25})`
                    : `rgba(239,68,68,${0.35 - pulse * 0.25})`}
                  strokeWidth={0}
                />
                <Marker coordinate={user} title="Bạn" />
              </>
            ) : null}
          </MapView>
        )}
      </View>
      <View style={styles.bottom}>
        {loadingGeo ? (
          <View style={styles.rowCenter}>
            <MaterialCommunityIcons name="map-marker-outline" size={24} color={theme.colors.onSurfaceVariant} />
            <Text style={styles.caption}>Đang tải khu vực kiểm tra...</Text>
          </View>
        ) : !center ? (
          <Text style={styles.caption}>Không hiển thị bản đồ (chưa có toạ độ khu vực)</Text>
        ) : (
          <>
            {user ? (
              <Text style={[styles.caption, { color: status?.allowed ? ((theme.colors as any).success ?? "#10b981") : (theme.colors.error ?? "#ef4444") }]}>
                {status?.allowed ? `✅ Trong khu vực (${status?.distance != null ? Math.round(status.distance) : 0}m / ${status?.radius ?? 0}m)` : `❌ Ngoài khu vực (${status?.distance != null ? Math.round(status.distance) : 0}m / ${status?.radius ?? 0}m)`}
              </Text>
            ) : (
              <View style={styles.rowCenter}>
                <Button icon="map-marker" mode="outlined" onPress={async () => { setLoadingGeo(true); const loc = await requestLocation(); setLoadingGeo(false); if (loc) { setUser(loc); evaluate(); } else { Alert.alert("Lỗi", "Trình duyệt không xác định được vị trí. Vui lòng bật định vị."); } }}>{loadingGeo ? "Đang định vị..." : "Lấy lại vị trí GPS"}</Button>
              </View>
            )}
            <Text style={styles.caption}>Vị trí chỉ dùng hiển thị trên bản đồ. Nút xác nhận bật khi bạn nằm trong bán kính cho phép.</Text>
            <Button
              icon="check"
              mode="contained"
              disabled={checking || !user || !status?.allowed}
              onPress={doCheckIn}
              style={[styles.checkInButton, { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary }]}
            >
              {checking ? "Đang ghi nhận..." : user ? (status?.allowed ? "Xác nhận điểm danh" : "Di chuyển vào khu vực thi") : "Xác định vị trí"}
            </Button>
          </>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", padding: 14, borderBottomWidth: 1, borderColor: "rgba(0,0,0,0.08)" },
  headerTitle: { fontSize: 17, fontWeight: "800" },
  subtitle: { paddingHorizontal: 14, paddingVertical: 8, fontSize: 13, color: "rgba(0,0,0,0.6)" },
  mapContainer: { flex: 1, backgroundColor: "#eef2f7" },
  loadingMap: { flex: 1, justifyContent: "center", alignItems: "center", alignSelf: "stretch" },
  caption: { paddingHorizontal: 14, fontSize: 12, color: "rgba(0,0,0,0.55)", marginTop: 6 },
  rowCenter: { flexDirection: "row", justifyContent: "center", alignItems: "center", paddingHorizontal: 14, marginTop: 8 },
  bottom: { padding: 12 },
  checkInButton: { marginTop: 8, borderRadius: 10 },
});
