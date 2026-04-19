import { create } from "zustand";

export type DownloadJobRecord = {
  jobId: string;
  jobType: string;
  resourceId: string;
  status: string;
  progress: number;
  localUri: string | null;
};

export type DownloadPackageRecord = {
  packageKey: string;
  packageType: string;
  status: string;
  progress: number;
};

interface DownloadStoreState {
  hydrated: boolean;
  jobs: DownloadJobRecord[];
  packages: DownloadPackageRecord[];
  setDownloads: (payload: {
    jobs: DownloadJobRecord[];
    packages: DownloadPackageRecord[];
  }) => void;
}

export const useDownloadStore = create<DownloadStoreState>((set) => ({
  hydrated: false,
  jobs: [],
  packages: [],
  setDownloads: ({ jobs, packages }) =>
    set({
      hydrated: true,
      jobs,
      packages,
    }),
}));
