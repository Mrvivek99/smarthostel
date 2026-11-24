export type Row = Record<string, any>;
export type Role = 'SUPER_ADMIN' | 'ADMIN' | 'WARDEN' | 'STUDENT';

export interface User {
  _id?: string;
  id?: string;
  name?: string;
  email: string;
  role: Role;
  organization?: any;
  organizationId?: string;
  avatar?: string;
}

export interface Meta { page?: number; limit?: number; total?: number }

export interface Option { value: string; label: string }

export interface FieldDef {
  name: string;
  label: string;
  type?: 'text' | 'email' | 'password' | 'number' | 'date' | 'datetime' | 'textarea' | 'select' | 'multiselect' | 'checkbox' | 'tel' | 'lineitems';
  required?: boolean;
  options?: Option[];
  remote?: {
    endpoint: string;
    params?: Record<string, any>;
    /** Re-fetch with `{[param]: values[field]}` when another form field changes */
    dependsOn?: { field: string; param: string };
    label: (r: Row) => string;
    value?: string;
    /** Client-side filter applied to the fetched rows */
    filter?: (r: Row) => boolean;
  };
  min?: number;
  max?: number;
  minLength?: number;
  pattern?: RegExp;
  patternMessage?: string;
  placeholder?: string;
  hint?: string;
  createOnly?: boolean;
  editOnly?: boolean;
  wide?: boolean;
  default?: any;
  validate?: (value: any, all: Row) => string | undefined;
}

export interface Column {
  key: string;
  header: string;
  accessor?: (row: Row) => string | number | null | undefined;
  render?: (row: Row) => React.ReactNode;
  sortable?: boolean;
  className?: string;
}

export interface FilterDef {
  key: string;
  label: string;
  options: Option[];
  accessor?: (row: Row) => string;
}
