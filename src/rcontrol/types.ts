export interface CreateAuthCodeRequestBody {
  AdminRequest: boolean;
  UserName: string;
  UserPass: string;
}

export interface CreateAuthCodeResponse {
  AdminLogin: string;
  AuthCode: string;
  ErrorCode: number;
  ErrorMsg: string;
  Success: boolean;
}

export interface CreateAccessTokenRequestBody {
  AuthCode: string;
}

export interface CreateAccessTokenResponse {
  AccessToken: string;
  AdminLogin: boolean;
  ErrorCode: number;
  ErrorMsg: string;
  RefreshToken: string;
  Success: boolean;
}

export interface DeviceDataRequestConfig {
  IMEI: string;
  UserID: string;
  ReturnCamerasData: boolean;
}
