//#region RControl Types

export interface M2MResponse {
  Success: boolean;
  ErrorCode: number;
  ErrorString: string;
}

//#endregion

//#region Get User Settings

export interface GetUserSettingsResponse extends M2MResponse {
  HAUserSettings: {
    Administrator: boolean;
    AlarmIMEIUserNumbers: AlarmIMEIUserNumber[];
    AvailableCultures: any;
    ClientID: number;
    ControllerPermitions: any;
    Culture: string;
    DiagnosticEnable: boolean;
    Email: string;
    GDPRAgreements: boolean;
    HasCreditAcount: boolean;
    ID: string;
    IsApproved: boolean;
    IsLockedOut: boolean;
    Name: string;
    OwnerUserID: string;
    PasswordNew: string;
    PasswordOld: string;
    PhoneCulture: string;
    ReadOnly: boolean;
    UserName: string;
    UserNameNew: string;
  };
  SystemSettingsVersion: string;
}

export interface AlarmIMEIUserNumber {
  IMEI: string;
  Number: string;
}

//#endregion

//#region Get All Device Data

export interface GetAllDeviceDataResponse extends M2MResponse {
  AlarmControlSettingsV2Response: AlarmControlSettingsV2Response;
  AlarmZoneUserGroupPartitionV2Response: AlarmZoneUserGroupPartitionV2Response;
  CamerasDataV2Response: CamerasDataV2Response;
  ClientDeviceDataV2Response: ClientDeviceDataV2Response;
}

export interface AlarmControlSettingsV2Response extends M2MResponse {
  IMEI: string;
  SerialNumber: string;
  ExternalDevices: ExternalDevice[];
}

export interface AlarmZoneUserGroupPartitionV2Response extends M2MResponse {
  AlarmZoneUserGroupPartitions: AlarmZoneUserGroupPartition[];
}

export interface CamerasDataV2Response {}

export interface ClientDeviceDataV2Response extends M2MResponse {
  SerialNumber: string;
  SiteNo: string;
}

export interface AlarmZoneUserGroupPartition {
  ClientID: number;
  Code: string;
  ID: number;
  Name: string;
  Type: PartitionType;
  UserID: string;
  VariableID: number;
}

export enum PartitionType {
  Zone = 0,
  User = 1,
  Partition = 2,
}

export interface ExternalDevice {
  DeviceState: DeviceState;
  DevicePIN: number;
  PartitionNumber: string;
  ZonesInfo: ZoneInfo[];
}

export interface ZoneInfo {
  ZoneID: string;
  ZoneName: null;
  ZoneRSSI: number;
  ZoneState: ZoneState;
}

export enum ZoneState {
  Closed = 1,
  Unknown = -2,
}

export enum DeviceState {
  ArmedAway = 1,
}

//#endregion
