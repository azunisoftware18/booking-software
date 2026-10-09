export const dashboardRoutePermissions = [
  { path: "/dashboard/place", permission: "PLACE.READ" },
  { path: "/dashboard/slots", permission: "SLOT.READ" },
  { path: "/dashboard/ticket", permission: "TICKET_TYPE.READ" },
  { path: "/dashboard/addon", permission: "ADDON.READ" },
  { path: "/dashboard/booking", permission: "BOOKING.READ" },
  { path: "/dashboard/ticket-scanner", permission: "TICKET.SCAN" },
  { path: "/dashboard/users-management", permission: "USER.READ" },
  { path: "/dashboard/role-management", permission: "ROLE.READ" },
  { path: "/dashboard/permission", permission: "PERMISSION.READ" },
  { path: "/dashboard/website-setting", permission: "SETTING.READ" },
  { path: "/dashboard", permission: "DASHBOARD.READ" },
];

export const hasPermission = (user, permission) => {
  if (!permission) return true;
  if (user?.role?.roleCode === "SUPER_ADMIN") return true;

  return (user?.permissions ?? []).some(
    (assignedPermission) =>
      `${assignedPermission.resource}.${assignedPermission.action}` ===
      permission
  );
};

export const canAccessDashboardRoute = (user, pathname) => {
  if (
    pathname === "/dashboard/profile" ||
    pathname.startsWith("/dashboard/profile/")
  ) {
    return true;
  }

  const route = dashboardRoutePermissions.find(
    ({ path }) =>
      pathname === path ||
      (path !== "/dashboard" && pathname.startsWith(`${path}/`))
  );

  return Boolean(route && hasPermission(user, route.permission));
};

export const getFirstAccessibleDashboardRoute = (user) =>
  dashboardRoutePermissions.find(
    ({ path, permission }) =>
      path !== "/dashboard" && hasPermission(user, permission)
  )?.path ?? null;
