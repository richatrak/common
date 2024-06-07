/* Copyright (C) 2024 by Rich Hsu, All Rights Reserved. */



/* eslint-disable @typescript-eslint/no-explicit-any */
export type AnyType = any ;

export type SimpleFunction = (...args: AnyType[]) => void ;
export type TypedFunction<T> = (arg: T) => void;

export type OrNull<T> = T | null;
export type OrNullCallback = OrNull<SimpleFunction>;
export type OneOrMany<T> = T | T[];
export type OneOrManyOrNull<T> = OrNull<OneOrMany<T>>;
export type Keys<T> = keyof T;
export type Values<T> = T[Keys<T>];
export type PickObj<T, U extends Keys<T>> = T[U];
export type PrimitiveType = string | number | boolean | null | undefined;
export type TypedRecords<T> = Record<string,T>
export type FreeRecords = TypedRecords<AnyType> ;
export type NestedRecords<T> = TypedRecords<T | TypedRecords<T>>;