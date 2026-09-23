export type Admin = {
  id: string;
  email: string;
  full_name: string | null;
  role: string;
  status: string;
  is_online: boolean | null;
  last_seen: string | null;
};

export type AdminWithPassword = Admin & {
  password: string;
};

export type RequestMetadata = {
  ipAddress: string | null;
  userAgent: string | null;
};