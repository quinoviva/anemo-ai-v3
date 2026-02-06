import { ConnectorConfig, DataConnect, QueryRef, QueryPromise, MutationRef, MutationPromise } from 'firebase/data-connect';

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

interface CreateUserRef {
  /* Allow users to create refs without passing in DataConnect */
  (vars: CreateUserVariables): MutationRef<CreateUserData, CreateUserVariables>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect, vars: CreateUserVariables): MutationRef<CreateUserData, CreateUserVariables>;
  operationName: string;
}
export const createUserRef: CreateUserRef;

export function createUser(vars: CreateUserVariables): MutationPromise<CreateUserData, CreateUserVariables>;
export function createUser(dc: DataConnect, vars: CreateUserVariables): MutationPromise<CreateUserData, CreateUserVariables>;

interface GetUserRef {
  /* Allow users to create refs without passing in DataConnect */
  (): QueryRef<GetUserData, undefined>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect): QueryRef<GetUserData, undefined>;
  operationName: string;
}
export const getUserRef: GetUserRef;

export function getUser(): QueryPromise<GetUserData, undefined>;
export function getUser(dc: DataConnect): QueryPromise<GetUserData, undefined>;

interface CreateSymptomEntryRef {
  /* Allow users to create refs without passing in DataConnect */
  (vars: CreateSymptomEntryVariables): MutationRef<CreateSymptomEntryData, CreateSymptomEntryVariables>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect, vars: CreateSymptomEntryVariables): MutationRef<CreateSymptomEntryData, CreateSymptomEntryVariables>;
  operationName: string;
}
export const createSymptomEntryRef: CreateSymptomEntryRef;

export function createSymptomEntry(vars: CreateSymptomEntryVariables): MutationPromise<CreateSymptomEntryData, CreateSymptomEntryVariables>;
export function createSymptomEntry(dc: DataConnect, vars: CreateSymptomEntryVariables): MutationPromise<CreateSymptomEntryData, CreateSymptomEntryVariables>;

interface ListSymptomEntriesRef {
  /* Allow users to create refs without passing in DataConnect */
  (): QueryRef<ListSymptomEntriesData, undefined>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect): QueryRef<ListSymptomEntriesData, undefined>;
  operationName: string;
}
export const listSymptomEntriesRef: ListSymptomEntriesRef;

export function listSymptomEntries(): QueryPromise<ListSymptomEntriesData, undefined>;
export function listSymptomEntries(dc: DataConnect): QueryPromise<ListSymptomEntriesData, undefined>;

