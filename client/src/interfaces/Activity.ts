export interface Activity {
  id: string;
  activity_name: string;
  activity_datetime: string;
  assigned_to: number | null;
  assigned_to_name: string | null;
  purpose: string | null;
  description: string | null;
  attendance: number | null;
  budget: number | null;
  assignments: string | null;
  spiritual: boolean;
  social: boolean;
  physical: boolean;
  intellectual: boolean;
  created_at: string;
  updated_at: string;
}

export interface ActivityFormData {
  activity_name: string;
  activity_datetime: string;
  assigned_to: string;
  purpose: string;
  description: string;
  attendance: string;
  budget: string;
  assignments: string;
  spiritual: boolean;
  social: boolean;
  physical: boolean;
  intellectual: boolean;
}

export const emptyActivityFormData: ActivityFormData = {
  activity_name: "",
  activity_datetime: "",
  assigned_to: "",
  purpose: "",
  description: "",
  attendance: "",
  budget: "",
  assignments: "",
  spiritual: false,
  social: false,
  physical: false,
  intellectual: false,
};
