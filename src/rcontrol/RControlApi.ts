import { User } from "homebridge";
import fetch, { Headers } from "node-fetch";
import {
  AlarmRemoteArmConfig,
  AlarmRemoteUnArmConfig,
  CreateAccessTokenResponse,
  CreateAuthCodeResponse,
  DeviceDataRequestConfig,
} from "./types";
import {
  AlarmZoneUserGroupPartition,
  ArmState,
  DeviceState,
  GetAllDeviceDataResponse,
  GetUserSettingsResponse,
  M2MResponse,
  PartitionType,
  ZoneInfo,
  ZoneState,
} from "./types/RControlApi";

export const API_URL =
  "https://app.m2mservices.com/CommonAdministrationService/api/v2";
export const AUTH_TOKEN_HEADER_NAME = "M2MOAuth2Token";

export default class RControlApi {
  private authCode?: string;
  private accessToken?: string;

  public async login(username: string, password: string) {
    try {
      this.authCode = await this.createAuthCode(username, password);

      this.accessToken = await this.createAccessToken(this.authCode);

      // console.log("Successfully logged in", this.authCode, this.accessToken);
    } catch (error) {
      console.error(`Login error:`, error);
      throw error;
    }
  }

  //#region Login API Methods

  private async createAuthCode(username: string, password: string) {
    const response = await fetch(`${API_URL}/createauthorizationcode`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        AdminRequest: false,
        UserName: username,
        UserPass: password,
      }),
    });

    const resBody: CreateAuthCodeResponse = await response.json();

    if (resBody.Success) {
      return resBody.AuthCode;
    }

    throw Error(resBody.ErrorMsg);
  }

  private async createAccessToken(authCode: string) {
    const response = await fetch(`${API_URL}/createaccesstoken`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        AuthCode: authCode,
      }),
    });

    const resBody: CreateAccessTokenResponse = await response.json();

    if (resBody.Success) {
      return resBody.AccessToken;
    }

    throw Error(resBody.ErrorMsg);
  }

  //#endregion

  //#region Data API Methods

  public async getUserSettings() {
    if (this.accessToken == null)
      throw Error("Login Request to get device data");

    const response = await fetch(`${API_URL}/gethausersettings`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        M2MOAuth2Token: this.accessToken,
      },
      body: "{}",
    });

    const resBody: GetUserSettingsResponse = await response.json();

    if (resBody.Success) {
      return resBody.HAUserSettings;
    }

    throw Error(resBody.ErrorString);
  }

  public async getDeviceData(config: DeviceDataRequestConfig) {
    if (this.accessToken == null)
      throw Error("Login Request to get device data");

    const response = await fetch(`${API_URL}/getalldevicedata`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        M2MOAuth2Token: this.accessToken,
      },
      body: JSON.stringify({
        UserID: config.UserID,
        IMEI: config.IMEI,
        SerialNumber: "",
        ProtocolNumber: 4,
      }),
    });

    const resBody: GetAllDeviceDataResponse = await response.json();

    if (!resBody.Success) {
      throw Error(resBody.ErrorString);
    }

    const { users, zones, partitions } = this.parsePartitions(
      resBody.AlarmZoneUserGroupPartitionV2Response
        .AlarmZoneUserGroupPartitions,
      resBody.AlarmControlSettingsV2Response.ExternalDevices[0].ZonesInfo
    );

    const deviceState =
      resBody.AlarmControlSettingsV2Response.ExternalDevices[0].DeviceState;

    let deviceInfo = {
      IMEI: resBody.AlarmControlSettingsV2Response.IMEI,
      SerialNumber: resBody.AlarmControlSettingsV2Response.SerialNumber,
      DeviceState: DeviceState[deviceState],
      Users: users,
      zones: zones.map(this.convertZoneToHumanReadable),
      partitions: partitions,
    };

    return resBody;
  }

  //#endregion

  //#region Action Methods

  public async RemoteArm(config: AlarmRemoteArmConfig) {
    if (this.accessToken == null) throw Error("Access Token can not be null");

    const response = await fetch(`${API_URL}/remotearm`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        M2MOAuth2Token: this.accessToken,
      },
      body: JSON.stringify({
        KeybusMode: true,
        OutDelay: "",
        PartitionNumber: config.PartitionNumber,
        ProtocolNumber: 4,
        OutPIN: "-1",
        SerialNumber: config.SerialNumber,
        UserNumber: config.UserNumber,
        ArmingState: config.ArmingState,
        IMEI: config.IMEI,
        UserPIN: config.UserPIN,
      }),
    });

    const resBody: M2MResponse = await response.json();

    if (!resBody.Success) {
      throw Error(resBody.ErrorString);
    }

    return resBody.Success;
  }

  public async RemoteUnarm(config: AlarmRemoteUnArmConfig) {
    return this.RemoteArm({ ...config, ArmingState: ArmState.Unarmed });
  }

  //#endregion

  //#region Utility Methods

  private parsePartitions(
    alarmZoneUserGroupPartitions: AlarmZoneUserGroupPartition[],
    zoneInfos: ZoneInfo[]
  ) {
    let users: UserItem[] = [];
    let zones: ZoneItem[] = [];
    let partitions: PartitionItem[] = [];

    alarmZoneUserGroupPartitions.forEach((p) => {
      const item = {
        name: p.Name,
        code: p.Code,
      };

      p.Type === PartitionType.User
        ? users.push(item)
        : p.Type === PartitionType.Zone
        ? zones.push({ ...item, state: ZoneState.Unknown })
        : p.Type === PartitionType.Partition
        ? partitions.push(item)
        : console.error("Unknown type", JSON.stringify(item));
    });

    zones = zones.map((z) => this.addZoneStateToZone(z, zoneInfos));

    return {
      users,
      zones,
      partitions,
    };
  }

  private addZoneStateToZone(zone: ZoneItem, zoneInfos: ZoneInfo[]) {
    const zoneInfo = zoneInfos.find((i) => i.ZoneID === zone.code);

    zone.state = zoneInfo?.ZoneState ?? ZoneState.Unknown;

    return zone;
  }

  private convertZoneToHumanReadable(z: ZoneItem) {
    return {
      name: z.name,
      code: z.code,
      state: ZoneState[z.state],
    };
  }

  //#endregion
}

interface PartitionItem {
  name: string;
  code: string;
}

interface UserItem extends PartitionItem {}

interface ZoneItem extends PartitionItem {
  state: ZoneState;
}
