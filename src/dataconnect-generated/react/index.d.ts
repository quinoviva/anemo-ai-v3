import { CreateUserData, CreateUserVariables, GetUserData, CreateSymptomEntryData, CreateSymptomEntryVariables, ListSymptomEntriesData } from '../';
import { UseDataConnectQueryResult, useDataConnectQueryOptions, UseDataConnectMutationResult, useDataConnectMutationOptions} from '@tanstack-query-firebase/react/data-connect';
import { UseQueryResult, UseMutationResult} from '@tanstack/react-query';
import { DataConnect } from 'firebase/data-connect';
import { FirebaseError } from 'firebase/app';


export function useCreateUser(options?: useDataConnectMutationOptions<CreateUserData, FirebaseError, CreateUserVariables>): UseDataConnectMutationResult<CreateUserData, CreateUserVariables>;
export function useCreateUser(dc: DataConnect, options?: useDataConnectMutationOptions<CreateUserData, FirebaseError, CreateUserVariables>): UseDataConnectMutationResult<CreateUserData, CreateUserVariables>;

export function useGetUser(options?: useDataConnectQueryOptions<GetUserData>): UseDataConnectQueryResult<GetUserData, undefined>;
export function useGetUser(dc: DataConnect, options?: useDataConnectQueryOptions<GetUserData>): UseDataConnectQueryResult<GetUserData, undefined>;

export function useCreateSymptomEntry(options?: useDataConnectMutationOptions<CreateSymptomEntryData, FirebaseError, CreateSymptomEntryVariables>): UseDataConnectMutationResult<CreateSymptomEntryData, CreateSymptomEntryVariables>;
export function useCreateSymptomEntry(dc: DataConnect, options?: useDataConnectMutationOptions<CreateSymptomEntryData, FirebaseError, CreateSymptomEntryVariables>): UseDataConnectMutationResult<CreateSymptomEntryData, CreateSymptomEntryVariables>;

export function useListSymptomEntries(options?: useDataConnectQueryOptions<ListSymptomEntriesData>): UseDataConnectQueryResult<ListSymptomEntriesData, undefined>;
export function useListSymptomEntries(dc: DataConnect, options?: useDataConnectQueryOptions<ListSymptomEntriesData>): UseDataConnectQueryResult<ListSymptomEntriesData, undefined>;
