import {
  AccessoryConfig,
  AccessoryPlugin,
  API,
  CharacteristicValue,
  HAP,
  Logging,
  Service,
} from "homebridge";
import RControlApi from "../rcontrol/RControlApi";
import {
  ArmState,
  DeviceState,
  GetAllDeviceDataResponse,
  UserSettings,
} from "../rcontrol/types/rcontrol-types";

export interface Options {
  name: string;
  username: string;
  password: string;
  pin: string;
}

export default (api: API) => {
  api.registerAccessory("RControl", RControlBridge);
};

export class RControlBridge implements AccessoryPlugin {
  private logger: Logging;
  private config: Options;
  private hap: HAP;
  private service: Service;
  private rcontrolApi: RControlApi;
  private informationService: Service;

  private userSettings?: UserSettings;
  private deviceSettings?: GetAllDeviceDataResponse;

  private targetState?: CharacteristicValue;

  constructor(logger: Logging, config: AccessoryConfig, api: API) {
    // Saving dependencies
    this.logger = logger;
    this.hap = api.hap;

    // Saving config
    this.config = {
      name: config.name as string,
      username: config.username as string,
      password: config.password as string,
      pin: config.pin as string,
    };

    // Creating hap service
    const Characteristic = this.hap.Characteristic;
    const Service = this.hap.Service;

    this.informationService = new Service.AccessoryInformation();
    this.service = new Service.SecuritySystem(config.name);
    this.service
      .getCharacteristic(Characteristic.SecuritySystemCurrentState)
      .onGet(this.handleSecuritySystemCurrentStateGet.bind(this));

    this.service
      .getCharacteristic(Characteristic.SecuritySystemTargetState)
      .onGet(this.handleSecuritySystemTargetStateGet.bind(this))
      .onSet(this.handleSecuritySystemTargetStateSet.bind(this));

    // Creating RControl Service
    this.rcontrolApi = new RControlApi();

    // Initalizing RControl Service
    if (!this.config.username || !this.config.password) {
      this.logger.error("No RControl credentials provided.");
    } else {
      this.initalizeApi();
    }
  }

  // Homebridge Methods
  private async handleSecuritySystemCurrentStateGet() {
    return await this.getCurrentAlarmState();
  }

  private async handleSecuritySystemTargetStateGet() {
    if (this.targetState) {
      return this.targetState;
    }

    const state = await this.getCurrentAlarmState();

    this.targetState = state;
    return state;
  }

  private async handleSecuritySystemTargetStateSet(value: CharacteristicValue) {
    switch (value) {
      case this.hap.Characteristic.SecuritySystemTargetState.DISARM:
        this.unarm();
        break;
      case this.hap.Characteristic.SecuritySystemTargetState.AWAY_ARM:
        this.armAway();
        break;
      case this.hap.Characteristic.SecuritySystemTargetState.STAY_ARM:
        this.armStay();
        break;
      case this.hap.Characteristic.SecuritySystemTargetState.NIGHT_ARM:
        this.armStay();
        break;
      default:
        throw this.logger(`Unknown Value: ${value}`);
    }
  }

  public getServices(): Service[] {
    return [this.informationService, this.service];
  }

  // API Methods
  private async initalizeApi() {
    // RControl Login
    await this.rcontrolApi.login(this.config.username, this.config.password);

    // RControl Get User & Device Info
    this.userSettings = await this.getUserSettings();
    this.deviceSettings = await this.getDeviceSettings();
  }

  private async getCurrentAlarmState() {
    if (!this.userSettings) this.getUserSettings();

    if (!this.deviceSettings) this.getDeviceSettings();

    const deviceDataResponse = await this.rcontrolApi.getDeviceData({
      IMEI: this.getIMEI(),
      UserID: this.getUserId(),
      ReturnCamerasData: false,
    });

    if (
      deviceDataResponse?.AlarmControlSettingsV2Response.ExternalDevices
        .length === 0
    ) {
      this.logger.error(
        "Failed to fetch alarm state: the provided credentials have no external devices in the account."
      );
    }

    const deviceState =
      deviceDataResponse?.AlarmControlSettingsV2Response.ExternalDevices[0]
        .DeviceState;

    if (!deviceState) this.logger.error("Could not get device state");

    return this.convertServerStateToHapState(deviceState);
  }

  // Setting Methods
  private async getUserSettings() {
    this.userSettings = await this.rcontrolApi.getUserSettings();

    return this.userSettings;
  }

  private async getDeviceSettings() {
    if (!this.userSettings) this.userSettings = await this.getUserSettings();

    this.deviceSettings = await this.rcontrolApi.getDeviceData({
      IMEI: this.userSettings.AlarmIMEIUserNumbers[0].IMEI,
      UserID: this.userSettings.ID,
      ReturnCamerasData: false,
    });

    return this.deviceSettings;
  }

  // Arm Helper Methods
  private async unarm() {
    if (!this.deviceSettings || !this.userSettings) {
      this.logger.error("must be logged in");
    }

    await this.rcontrolApi.RemoteUnarm({
      IMEI: this.getIMEI(),
      PartitionNumber: this.getPartitionNumber(),
      SerialNumber: this.getSerialNumber(),
      UserNumber: this.getUserNumber(),
      UserPIN: this.config.pin,
    });
  }

  private async armAway() {
    if (!this.deviceSettings || !this.userSettings) {
      this.logger.error("must be logged in");
    }

    await this.rcontrolApi.RemoteArm({
      ArmingState: ArmState.ArmedAway,
      IMEI: this.getIMEI(),
      PartitionNumber: this.getPartitionNumber(),
      SerialNumber: this.getSerialNumber(),
      UserNumber: this.getUserNumber(),
      UserPIN: this.config.pin,
    });
  }

  private async armStay() {
    if (!this.deviceSettings || !this.userSettings) {
      throw Error("must be logged in");
    }

    await this.rcontrolApi.RemoteArm({
      ArmingState: ArmState.ArmedStay,
      IMEI: this.getIMEI(),
      PartitionNumber: this.getPartitionNumber(),
      SerialNumber: this.getSerialNumber(),
      UserNumber: this.getUserNumber(),
      UserPIN: this.config.pin,
    });
  }

  // Data Methods
  private getIMEI() {
    if (!this.userSettings) throw Error("Could not get IMEI");

    return this.userSettings.AlarmIMEIUserNumbers[0].IMEI;
  }

  private getUserNumber() {
    if (!this.userSettings) throw Error("Could not get UserNumber");

    return this.userSettings.AlarmIMEIUserNumbers[0].Number;
  }

  private getUserId() {
    if (!this.userSettings) throw Error("Could not get UserNumber");

    return this.userSettings.ID;
  }

  private getPartitionNumber() {
    if (!this.deviceSettings) throw Error("Could not get Partition Number");

    return this.deviceSettings.AlarmControlSettingsV2Response.ExternalDevices[0]
      .PartitionNumber;
  }

  private getSerialNumber() {
    if (!this.deviceSettings) throw Error("Could not get Serial Number");

    return this.deviceSettings.AlarmControlSettingsV2Response.SerialNumber;
  }

  private convertServerStateToHapState(deviceState: DeviceState) {
    switch (deviceState) {
      case DeviceState.ArmedAway:
        return this.hap.Characteristic.SecuritySystemTargetState.AWAY_ARM;
      case DeviceState.ArmedStay:
        return this.hap.Characteristic.SecuritySystemTargetState.STAY_ARM;
      case DeviceState.Disarmed:
        return this.hap.Characteristic.SecuritySystemTargetState.DISARM;
      default:
        throw Error(`Unknown Value: ${deviceState}`);
    }
  }
}
