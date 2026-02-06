import { ConnectorConfig, DataConnect, OperationOptions, ExecuteOperationResponse } from 'firebase-admin/data-connect';

export const connectorConfig: ConnectorConfig;

export type TimestampString = string;
export type UUIDString = string;
export type Int64String = string;
export type DateString = string;


export interface AnemiaAssessment_Key {
  id: UUIDString;
  __typename?: 'AnemiaAssessment_Key';
}

export interface CreateSymptomEntryData {
  symptomEntry_insert: SymptomEntry_Key;
}

export interface CreateSymptomEntryVariables {
  symptomName: string;
  severity: number;
  description?: string | null;
}

export interface CreateUserData {
  user_insert: User_Key;
}

export interface CreateUserVariables {
  displayName: string;
  email?: string | null;
  gender?: string | null;
  height?: number | null;
  weight?: number | null;
  dateOfBirth?: DateString | null;
}

export interface DietaryIntake_Key {
  id: UUIDString;
  __typename?: 'DietaryIntake_Key';
}

export interface GetUserData {
  user?: {
    id: UUIDString;
    displayName: string;
    email?: string | null;
    gender?: string | null;
    height?: number | null;
    weight?: number | null;
    dateOfBirth?: DateString | null;
  } & User_Key;
}

export interface HealthMetric_Key {
  id: UUIDString;
  __typename?: 'HealthMetric_Key';
}

export interface ListSymptomEntriesData {
  symptomEntries: ({
    id: UUIDString;
    symptomName: string;
    severity: number;
    description?: string | null;
    recordedAt: TimestampString;
  } & SymptomEntry_Key)[];
}

export interface SymptomEntry_Key {
  id: UUIDString;
  __typename?: 'SymptomEntry_Key';
}

export interface User_Key {
  id: UUIDString;
  __typename?: 'User_Key';
}

/** Generated Node Admin SDK operation action function for the 'CreateUser' Mutation. Allow users to execute without passing in DataConnect. */
export function createUser(dc: DataConnect, vars: CreateUserVariables, options?: OperationOptions): Promise<ExecuteOperationResponse<CreateUserData>>;
/** Generated Node Admin SDK operation action function for the 'CreateUser' Mutation. Allow users to pass in custom DataConnect instances. */
export function createUser(vars: CreateUserVariables, options?: OperationOptions): Promise<ExecuteOperationResponse<CreateUserData>>;

/** Generated Node Admin SDK operation action function for the 'GetUser' Query. Allow users to execute without passing in DataConnect. */
export function getUser(dc: DataConnect, options?: OperationOptions): Promise<ExecuteOperationResponse<GetUserData>>;
/** Generated Node Admin SDK operation action function for the 'GetUser' Query. Allow users to pass in custom DataConnect instances. */
export function getUser(options?: OperationOptions): Promise<ExecuteOperationResponse<GetUserData>>;

/** Generated Node Admin SDK operation action function for the 'CreateSymptomEntry' Mutation. Allow users to execute without passing in DataConnect. */
export function createSymptomEntry(dc: DataConnect, vars: CreateSymptomEntryVariables, options?: OperationOptions): Promise<ExecuteOperationResponse<CreateSymptomEntryData>>;
/** Generated Node Admin SDK operation action function for the 'CreateSymptomEntry' Mutation. Allow users to pass in custom DataConnect instances. */
export function createSymptomEntry(vars: CreateSymptomEntryVariables, options?: OperationOptions): Promise<ExecuteOperationResponse<CreateSymptomEntryData>>;

/** Generated Node Admin SDK operation action function for the 'ListSymptomEntries' Query. Allow users to execute without passing in DataConnect. */
export function listSymptomEntries(dc: DataConnect, options?: OperationOptions): Promise<ExecuteOperationResponse<ListSymptomEntriesData>>;
/** Generated Node Admin SDK operation action function for the 'ListSymptomEntries' Query. Allow users to pass in custom DataConnect instances. */
export function listSymptomEntries(options?: OperationOptions): Promise<ExecuteOperationResponse<ListSymptomEntriesData>>;

