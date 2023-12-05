export type Modify<T, R> = Omit<T, keyof R> & R;

export type WithRequired<T, K extends keyof T> = T & { [P in K]-?: T[P] };

export type valueof<T> = T[keyof T];
