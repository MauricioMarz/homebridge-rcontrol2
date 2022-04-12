import { ArmState } from "./rcontrol-types";

export interface DeviceDataRequestConfig {
  IMEI: string;
  UserID: string;
  ReturnCamerasData: boolean;
}

export interface AlarmRemoteArmBaseConfig {
  PartitionNumber: string;
  SerialNumber: string;
  IMEI: string;
  UserPIN: "EMPTY" | string;
  UserNumber: string;
}

export interface AlarmRemoteArmConfig extends AlarmRemoteArmBaseConfig {
  ArmingState: ArmState;
}

export interface AlarmRemoteUnArmConfig extends AlarmRemoteArmBaseConfig {}
