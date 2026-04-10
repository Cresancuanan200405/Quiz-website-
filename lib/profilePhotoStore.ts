"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

export type ProfilePhotoType = "initials" | "icon" | "image";

export interface ProfilePhotoValue {
  type: ProfilePhotoType;
  value: string;
}

interface ProfilePhotoState {
  photo: ProfilePhotoValue;
  setPhoto: (photo: ProfilePhotoValue) => void;
  resetPhoto: () => void;
}

const defaultPhoto: ProfilePhotoValue = {
  type: "initials",
  value: "PL",
};

export const useProfilePhotoStore = create<ProfilePhotoState>()(
  persist(
    (set) => ({
      photo: defaultPhoto,
      setPhoto: (photo) => set({ photo }),
      resetPhoto: () => set({ photo: defaultPhoto }),
    }),
    {
      name: "profile-photo-store",
    }
  )
);
