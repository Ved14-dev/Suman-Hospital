// Only modules that have a complete demo workflow should be reachable.
export const enabledModules = {
  public: true,
  auth: true,
  patients: true,
  appointments: true,
  opd: true,
  emr: true,
  billing: false,
  pharmacy: false,
  ipd: true,
  staff: false,
  audit: false,
  backup: false,
};

export const isModuleEnabled = (moduleName) => Boolean(enabledModules[moduleName]);
