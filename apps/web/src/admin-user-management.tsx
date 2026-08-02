import React, {
  useEffect,
  useMemo,
  useState,
} from "react";

type WorkspaceType =
  | "PERSONAL"
  | "FAMILY"
  | "BUSINESS";

type WorkspacePackage =
  | WorkspaceType
  | "PERSONAL_PRO";

type AdminManagedUser = {
  userId:string;
  email:string;
  name:string | null;
  isSuperAdmin?:boolean;
  status?:string | null;
  bannedAt?:string | null;
  deactivatedAt?:string | null;
  package:WorkspacePackage;
  subscriptionPlan:string;
  subscriptionStatus:string;

  workspace:{
    id:string;
    name:string;
    type:WorkspaceType;
    role?:string | null;
    memberCount:number;
    googleConnected:boolean;
    spreadsheetId?:string | null;
    whatsappCount:number;
    whatsappConnectedCount?:number;
  } | null;

  createdAt:string;
  updatedAt:string;
};

type AdminUserManagementProps = {
  users:AdminManagedUser[];
  busyUserId:string;
  message?:string;
  onRefresh:() => void;

  onUpdatePackage:(
    userId:string,
    packageType:WorkspacePackage,
  ) => Promise<void> | void;

  onSuperAdminUserAction:(
    userId:string,
    action:
      | "google-sheet/upgrade"
      | "whatsapp/disconnect"
      | "deactivate"
      | "reactivate"
      | "delete",
    label:string,
    confirmText:string,
  ) => Promise<void> | void;
};

type IconName =
  | "users"
  | "user"
  | "whatsapp"
  | "sheet"
  | "search"
  | "refresh"
  | "shield"
  | "calendar"
  | "more"
  | "close";

type StatusFilter =
  | "ALL"
  | "ACTIVE"
  | "DEACTIVATED";

type WorkspaceFilter =
  | "ALL"
  | WorkspaceType
  | "NO_WORKSPACE";

const packageOptions:Array<{
  value:WorkspacePackage;
  label:string;
}> = [
  {
    value:"PERSONAL",
    label:"Personal",
  },
  {
    value:"PERSONAL_PRO",
    label:"Personal Pro",
  },
  {
    value:"FAMILY",
    label:"Family",
  },
  {
    value:"BUSINESS",
    label:"Business",
  },
];

function Icon(
  props:{
    name:IconName;
    size?:number;
  },
){
  const size =
    props.size
    ??
    18;

  const common = {
    width:size,
    height:size,
    viewBox:"0 0 24 24",
    fill:"none",
    stroke:"currentColor",
    strokeWidth:1.9,
    strokeLinecap:"round" as const,
    strokeLinejoin:"round" as const,
    "aria-hidden":true,
  };

  if(props.name === "users"){
    return (
      <svg {...common}>
        <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
        <path d="M16 3.13a4 4 0 0 1 0 7.75" />
      </svg>
    );
  }

  if(props.name === "user"){
    return (
      <svg {...common}>
        <circle cx="12" cy="8" r="4" />
        <path d="M4 21a8 8 0 0 1 16 0" />
      </svg>
    );
  }

  if(props.name === "whatsapp"){
    return (
      <svg {...common}>
        <path d="M20.5 11.7a8.5 8.5 0 0 1-12.55 7.47L3 20.5l1.32-4.82A8.5 8.5 0 1 1 20.5 11.7Z" />
        <path d="M8.5 7.8c.3-.3.7-.25.9.15l1 2c.15.3.08.6-.15.82l-.7.65a6.8 6.8 0 0 0 3.2 3.15l.62-.73c.2-.25.55-.32.82-.18l2.02 1c.38.18.45.6.17.9-.62.72-1.5 1.05-2.42.88-3.45-.65-6.2-3.38-6.86-6.82-.18-.9.18-1.8.9-2.42Z" />
      </svg>
    );
  }

  if(props.name === "sheet"){
    return (
      <svg {...common}>
        <path d="M6 2h9l5 5v15H6z" />
        <path d="M14 2v6h6" />
        <path d="M9 13h8M9 17h8M12 10v10" />
      </svg>
    );
  }

  if(props.name === "search"){
    return (
      <svg {...common}>
        <circle cx="11" cy="11" r="7" />
        <path d="m20 20-4-4" />
      </svg>
    );
  }

  if(props.name === "refresh"){
    return (
      <svg {...common}>
        <path d="M20 6v5h-5" />
        <path d="M4 18v-5h5" />
        <path d="M18.4 9A7 7 0 0 0 6.2 6.2L4 8" />
        <path d="M5.6 15A7 7 0 0 0 17.8 17.8L20 16" />
      </svg>
    );
  }

  if(props.name === "shield"){
    return (
      <svg {...common}>
        <path d="M12 3 20 6v5c0 5-3.4 8.5-8 10-4.6-1.5-8-5-8-10V6z" />
        <path d="m9 12 2 2 4-4" />
      </svg>
    );
  }

  if(props.name === "calendar"){
    return (
      <svg {...common}>
        <rect x="3" y="5" width="18" height="16" rx="2" />
        <path d="M16 3v4M8 3v4M3 10h18" />
      </svg>
    );
  }

  if(props.name === "close"){
    return (
      <svg {...common}>
        <path d="m6 6 12 12M18 6 6 18" />
      </svg>
    );
  }

  return (
    <svg {...common}>
      <circle cx="12" cy="5" r="1" fill="currentColor" stroke="none" />
      <circle cx="12" cy="12" r="1" fill="currentColor" stroke="none" />
      <circle cx="12" cy="19" r="1" fill="currentColor" stroke="none" />
    </svg>
  );
}

function formatDate(
  value:string,
){
  const parsed =
    new Date(value);

  if(
    Number.isNaN(
      parsed.getTime(),
    )
  ){
    return "-";
  }

  return parsed.toLocaleDateString(
    "en-MY",
    {
      day:"2-digit",
      month:"short",
      year:"numeric",
    },
  );
}

function initials(
  user:AdminManagedUser,
){
  const source =
    user.name?.trim()
    ||
    user.email;

  return source
    .split(/[\s@._-]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map(
      (part) =>
        part.charAt(0).toUpperCase(),
    )
    .join("");
}

function packageLabel(
  value:WorkspacePackage,
){
  return (
    packageOptions.find(
      (option) =>
        option.value === value,
    )?.label
    ??
    value
  );
}

function packagePrice(
  value:WorkspacePackage,
){
  if(value === "PERSONAL_PRO"){
    return "RM9 / month";
  }

  if(value === "FAMILY"){
    return "RM19 / month";
  }

  if(value === "BUSINESS"){
    return "RM49 / month";
  }

  return "RM0 / free";
}

function effectiveStatus(
  user:AdminManagedUser,
){
  if(user.bannedAt){
    return "DEACTIVATED";
  }

  if(user.deactivatedAt){
    return "DEACTIVATED";
  }

  const status =
    (
      user.status
      ||
      user.subscriptionStatus
      ||
      "ACTIVE"
    )
      .trim()
      .toUpperCase();

  if(status === "BANNED"){
    return "DEACTIVATED";
  }

  if(status === "DEACTIVATED"){
    return "DEACTIVATED";
  }

  return "ACTIVE";
}

function statusLabel(
  status:string,
){
  if(status === "BANNED"){
    return "Banned";
  }

  if(status === "DEACTIVATED"){
    return "Deactivated";
  }

  return "Active";
}

export function AdminUserManagement(
  props:AdminUserManagementProps,
){
  const [
    query,
    setQuery,
  ] =
    useState("");

  const [
    packageFilter,
    setPackageFilter,
  ] =
    useState<
      "ALL" | WorkspacePackage
    >("ALL");

  const [
    statusFilter,
    setStatusFilter,
  ] =
    useState<StatusFilter>(
      "ALL",
    );

  const [
    workspaceFilter,
    setWorkspaceFilter,
  ] =
    useState<WorkspaceFilter>(
      "ALL",
    );

  const [
    currentPage,
    setCurrentPage,
  ] =
    useState(
      1,
    );

  const [
    selectedUser,
    setSelectedUser,
  ] =
    useState<AdminManagedUser | null>(
      null,
    );

  useEffect(
    () => {
      if(!selectedUser){
        return;
      }

      const previousOverflow =
        document.body.style.overflow;

      const closeOnEscape = (
        event:KeyboardEvent,
      ) => {
        if(event.key === "Escape"){
          setSelectedUser(
            null,
          );
        }
      };

      document.body.style.overflow =
        "hidden";

      window.addEventListener(
        "keydown",
        closeOnEscape,
      );

      return () => {
        document.body.style.overflow =
          previousOverflow;

        window.removeEventListener(
          "keydown",
          closeOnEscape,
        );
      };
    },
    [
      selectedUser,
    ],
  );

  const pageSize =
    10;

  const filteredUsers =
    useMemo(
      () => {
        const search =
          query
            .trim()
            .toLowerCase();

        return props.users.filter(
          (user) => {
            const workspace =
              user.workspace;

            const searchFields = [
              user.name,
              user.email,
              workspace?.name,
              workspace?.id,
              workspace?.type,
              workspace?.role,
              user.package,
            ]
              .filter(Boolean)
              .map(
                (value) =>
                  String(value).toLowerCase(),
              );

            const matchesSearch =
              !search
              ||
              searchFields.some(
                (value) =>
                  value.includes(search),
              );

            const matchesPackage =
              packageFilter === "ALL"
              ||
              user.package === packageFilter;

            const status =
              effectiveStatus(user);

            const matchesStatus =
              statusFilter === "ALL"
              ||
              status === statusFilter;

            const matchesWorkspace =
              workspaceFilter === "ALL"
              ||
              (
                workspaceFilter === "NO_WORKSPACE"
                  ?
                  !workspace
                  :
                  workspace?.type === workspaceFilter
              );

            return (
              matchesSearch
              &&
              matchesPackage
              &&
              matchesStatus
              &&
              matchesWorkspace
            );
          },
        );
      },
      [
        props.users,
        query,
        packageFilter,
        statusFilter,
        workspaceFilter,
      ],
    );

  const activeUsers =
    props.users.filter(
      (user) =>
        effectiveStatus(user)
        ===
        "ACTIVE",
    ).length;

  const googleUsers =
    props.users.filter(
      (user) =>
        user.workspace?.googleConnected,
    ).length;

  const whatsappUsers =
    props.users.filter(
      (user) =>
        (
          user.workspace
            ?.whatsappConnectedCount
          ??
          0
        ) > 0,
    ).length;

  const totalPages =
    Math.max(
      1,
      Math.ceil(
        filteredUsers.length
        /
        pageSize,
      ),
    );

  const safeCurrentPage =
    Math.min(
      currentPage,
      totalPages,
    );

  const firstResult =
    (
      safeCurrentPage
      -
      1
    )
    *
    pageSize;

  const paginatedUsers =
    filteredUsers.slice(
      firstResult,
      firstResult
      +
      pageSize,
    );

  const lastResult =
    Math.min(
      firstResult
      +
      paginatedUsers.length,
      filteredUsers.length,
    );

  const filtersActive =
    Boolean(query)
    ||
    packageFilter !== "ALL"
    ||
    statusFilter !== "ALL"
    ||
    workspaceFilter !== "ALL";

  function resetFilters(){
    setQuery("");
    setPackageFilter("ALL");
    setStatusFilter("ALL");
    setWorkspaceFilter("ALL");
    setCurrentPage(1);
  }

  useEffect(
    () => {

      if(!selectedUser){
        return;
      }

      const refreshedUser =
        props.users.find(
          (user) =>
            user.userId
            ===
            selectedUser.userId,
        );

      if(!refreshedUser){

        setSelectedUser(
          null,
        );

        return;

      }

      setSelectedUser(
        refreshedUser,
      );

    },
    [
      props.users,
      selectedUser?.userId,
    ],
  );


  const selectedWorkspace =
    selectedUser?.workspace
    ??
    null;

  const selectedStatus =
    selectedUser
      ?
      effectiveStatus(
        selectedUser,
      )
      :
      "ACTIVE";

  const selectedWhatsappOnline =
    (
      selectedWorkspace
        ?.whatsappConnectedCount
      ??
      0
    ) > 0;

  const selectedSheetUrl =
    selectedWorkspace?.spreadsheetId
      ?
      `https://docs.google.com/spreadsheets/d/${selectedWorkspace.spreadsheetId}/edit`
      :
      "";

  function runSelectedUserAction(
    action:
      | "google-sheet/upgrade"
      | "whatsapp/disconnect"
      | "deactivate"
      | "reactivate"
      | "delete",
    label:string,
    confirmText:string,
  ){
    if(!selectedUser){
      return;
    }

    const userId =
      selectedUser.userId;

    void props.onSuperAdminUserAction(
      userId,
      action,
      label,
      confirmText,
    );
  }

  return (
    <section className="admin-users-shell">
      <header className="admin-users-header">
        <div className="admin-users-heading">
          <span className="admin-users-eyebrow">
            Super Admin
          </span>

          <div className="admin-users-title-row">
            <h2>
              User Management
            </h2>

            <span className="admin-title-shield">
              <Icon
                name="shield"
                size={18}
              />
            </span>
          </div>

          <p>
            Manage all registered users, workspace connections
            and subscription packages.
          </p>
        </div>

        <button
          className="admin-users-refresh"
          type="button"
          onClick={props.onRefresh}
        >
          <Icon
            name="refresh"
            size={17}
          />

          Refresh users
        </button>
      </header>

      <div className="admin-users-stats">
        <article>
          <span className="admin-stat-icon">
            <Icon
              name="users"
              size={25}
            />
          </span>

          <div>
            <span>Registered Users</span>
            <strong>
              {props.users.length}
            </strong>
            <small>Total accounts</small>
          </div>
        </article>

        <article>
          <span className="admin-stat-icon">
            <Icon
              name="user"
              size={25}
            />
          </span>

          <div>
            <span>Active Accounts</span>
            <strong>
              {activeUsers}
            </strong>
            <small>Currently active</small>
          </div>
        </article>

        <article>
          <span className="admin-stat-icon">
            <Icon
              name="whatsapp"
              size={26}
            />
          </span>

          <div>
            <span>WhatsApp Connected</span>
            <strong>
              {whatsappUsers}
            </strong>
            <small>Connected accounts</small>
          </div>
        </article>

        <article>
          <span className="admin-stat-icon">
            <Icon
              name="sheet"
              size={24}
            />
          </span>

          <div>
            <span>Google Sheets</span>
            <strong>
              {googleUsers}
            </strong>
            <small>Connected workspaces</small>
          </div>
        </article>
      </div>

      <div className="admin-users-toolbar">
        <label className="admin-users-search">
          <Icon
            name="search"
            size={18}
          />

          <input
            type="search"
            value={query}
            placeholder="Search by name, email or workspace..."
            onChange={
              (event) => {
                setQuery(
                  event.target.value,
                );

                setCurrentPage(
                  1,
                );
              }
            }
          />
        </label>

        <label className="admin-users-select">
          <select
            value={packageFilter}
            aria-label="Filter package"
            onChange={
              (event) => {
                setPackageFilter(
                  event.target.value as
                    "ALL" | WorkspacePackage,
                );

                setCurrentPage(
                  1,
                );
              }
            }
          >
            <option value="ALL">
              All Packages
            </option>

            {packageOptions.map(
              (option) => (
                <option
                  key={option.value}
                  value={option.value}
                >
                  {option.label}
                </option>
              ),
            )}
          </select>
        </label>

        <label className="admin-users-select">
          <select
            value={statusFilter}
            aria-label="Filter status"
            onChange={
              (event) => {
                setStatusFilter(
                  event.target.value as
                    StatusFilter,
                );

                setCurrentPage(
                  1,
                );
              }
            }
          >
            <option value="ALL">
              All Status
            </option>

            <option value="ACTIVE">
              Active
            </option>

            <option value="DEACTIVATED">
              Deactivated
            </option>
          </select>
        </label>

        <label className="admin-users-select">
          <select
            value={workspaceFilter}
            aria-label="Filter workspace"
            onChange={
              (event) => {
                setWorkspaceFilter(
                  event.target.value as
                    WorkspaceFilter,
                );

                setCurrentPage(
                  1,
                );
              }
            }
          >
            <option value="ALL">
              All Workspaces
            </option>

            <option value="PERSONAL">
              Personal
            </option>

            <option value="FAMILY">
              Family
            </option>

            <option value="BUSINESS">
              Business
            </option>

            <option value="NO_WORKSPACE">
              No Workspace
            </option>
          </select>
        </label>

        <button
          type="button"
          className="admin-filter-clear"
          disabled={!filtersActive}
          onClick={resetFilters}
        >
          <Icon
            name="close"
            size={15}
          />

          Clear
        </button>
      </div>

      {props.message && (
        <div className="admin-users-message">
          {props.message}
        </div>
      )}

      {filteredUsers.length === 0
        ? (
          <div className="admin-users-empty">
            <span className="admin-empty-icon">
              <Icon
                name="users"
                size={28}
              />
            </span>

            <strong>
              No users found
            </strong>

            <span>
              Try changing the search or filter settings.
            </span>
          </div>
        )
        : (
          <div className="admin-users-table-wrap">
            <table className="admin-users-table">
              <thead>
                <tr>
                  <th>User</th>
                  <th>Workspace</th>
                  <th>Connections</th>
                  <th>Registered</th>
                  <th>Package</th>
                  <th>Status</th>
                </tr>
              </thead>

              <tbody>
                {paginatedUsers.map(
                  (user) => {
                    const workspace =
                      user.workspace;

                    const isOwner =
                      workspace?.role === "OWNER";

                    const isBusy =
                      props.busyUserId
                      ===
                      user.userId;

                    const whatsappOnline =
                      (
                        workspace
                          ?.whatsappConnectedCount
                        ??
                        0
                      ) > 0;

                    const status =
                      effectiveStatus(user);

                    const sheetUrl =
                      workspace?.spreadsheetId
                        ?
                        `https://docs.google.com/spreadsheets/d/${workspace.spreadsheetId}/edit`
                        :
                        "";

                    return (
                      <tr key={user.userId}>
                        <td data-label="User">
                          <div
                            className="admin-user-identity admin-user-clickable"
                            role="button"
                            tabIndex={0}
                            aria-label={`Manage ${user.email}`}
                            onClick={
                              () =>
                                setSelectedUser(
                                  user,
                                )
                            }
                            onKeyDown={
                              (event) => {
                                if(
                                  event.key === "Enter"
                                  ||
                                  event.key === " "
                                ){
                                  event.preventDefault();

                                  setSelectedUser(
                                    user,
                                  );
                                }
                              }
                            }
                          >
                            <span className="admin-user-avatar">
                              {initials(user)}

                              <i
                                className={
                                  status === "ACTIVE"
                                    ?
                                    "online"
                                    :
                                    "offline"
                                }
                              />
                            </span>

                            <div>
                              <strong>
                                {user.name || "Unnamed user"}
                              </strong>

                              <span>
                                {user.email}
                              </span>

                              <div className="admin-user-badges">
                                {user.isSuperAdmin && (
                                  <em className="admin-user-badge super">
                                    Super Admin
                                  </em>
                                )}

                                <em className="admin-user-badge">
                                  {statusLabel(status)}
                                </em>
                              </div>
                            </div>
                          </div>
                        </td>

                        <td data-label="Workspace">
                          {workspace
                            ? (
                              <div className="admin-workspace-detail">
                                <strong>
                                  {workspace.name}
                                </strong>

                                <span>
                                  {workspace.type}
                                  {" · "}
                                  {workspace.role || "NO ROLE"}
                                </span>

                                <span>
                                  {workspace.memberCount} member
                                  {workspace.memberCount === 1
                                    ? ""
                                    : "s"}
                                </span>
                              </div>
                            )
                            : (
                              <span className="admin-muted">
                                No active workspace
                              </span>
                            )}
                        </td>

                        <td data-label="Connections">
                          <div className="admin-connection-list">
                            <span
                              className={
                                whatsappOnline
                                  ?
                                  "admin-channel-badge success"
                                  :
                                  "admin-channel-badge muted"
                              }
                            >
                              <Icon
                                name="whatsapp"
                                size={13}
                              />

                              WhatsApp
                            </span>

                            <span
                              className={
                                workspace?.googleConnected
                                  ?
                                  "admin-channel-badge success"
                                  :
                                  "admin-channel-badge muted"
                              }
                            >
                              <Icon
                                name="sheet"
                                size={13}
                              />

                              Google Sheet
                            </span>
                          </div>
                        </td>

                        <td data-label="Registered">
                          <div className="admin-date-detail">
                            <div>
                              <Icon
                                name="calendar"
                                size={15}
                              />

                              <strong>
                                {formatDate(user.createdAt)}
                              </strong>
                            </div>

                            <span>
                              ID: {user.userId.slice(0, 12)}…
                            </span>
                          </div>
                        </td>

                        <td data-label="Package">
                          <div className="admin-package-display">
                            <strong>
                              {packageLabel(user.package)}
                            </strong>

                            <span>
                              {packagePrice(user.package)}
                            </span>
                          </div>
                        </td>

                        <td data-label="Status">
                          <span
                            className={
                              `admin-status-badge ${status.toLowerCase()}`
                            }
                          >
                            <i />

                            {statusLabel(status)}
                          </span>
                        </td>

                      </tr>
                    );
                  },
                )}
              </tbody>
            </table>

            <footer className="admin-users-table-footer">
              <span>
                Showing{" "}
                {filteredUsers.length
                  ?
                  firstResult + 1
                  :
                  0}
                {" "}to{" "}
                {lastResult}
                {" "}of{" "}
                {filteredUsers.length}
                {" "}users
              </span>

              <div className="admin-users-pagination">
                <button
                  type="button"
                  aria-label="Previous page"
                  disabled={safeCurrentPage <= 1}
                  onClick={
                    () =>
                      setCurrentPage(
                        safeCurrentPage - 1,
                      )
                  }
                >
                  ‹
                </button>

                <strong>
                  {safeCurrentPage}
                </strong>

                <button
                  type="button"
                  aria-label="Next page"
                  disabled={
                    safeCurrentPage
                    >=
                    totalPages
                  }
                  onClick={
                    () =>
                      setCurrentPage(
                        safeCurrentPage + 1,
                      )
                  }
                >
                  ›
                </button>
              </div>
            </footer>
          </div>
        )}

      {selectedUser && (
        <div
          className="admin-user-modal-overlay"
          role="presentation"
          onMouseDown={
            (event) => {
              if(
                event.target
                ===
                event.currentTarget
              ){
                setSelectedUser(
                  null,
                );
              }
            }
          }
        >
          <section
            className="admin-user-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="admin-user-modal-title"
          >
            <header className="admin-user-modal-header">
              <div className="admin-user-modal-profile">
                <span className="admin-user-modal-avatar">
                  {initials(selectedUser)}

                  <i
                    className={
                      selectedStatus === "ACTIVE"
                        ?
                        "online"
                        :
                        "offline"
                    }
                  />
                </span>

                <div>
                  <span className="admin-user-modal-eyebrow">
                    User Management
                  </span>

                  <h3 id="admin-user-modal-title">
                    {selectedUser.name || "Unnamed user"}
                  </h3>

                  <p>
                    {selectedUser.email}
                  </p>
                </div>
              </div>

              <button
                type="button"
                className="admin-user-modal-close"
                aria-label="Close user management"
                onClick={
                  () =>
                    setSelectedUser(
                      null,
                    )
                }
              >
                <Icon
                  name="close"
                  size={19}
                />
              </button>
            </header>

            <div className="admin-user-modal-summary">
              <span
                className={
                  `admin-status-badge ${selectedStatus.toLowerCase()}`
                }
              >
                <i />

                {statusLabel(selectedStatus)}
              </span>

              <span className="admin-user-modal-plan">
                {packageLabel(selectedUser.package)}
              </span>

              {selectedUser.isSuperAdmin && (
                <span className="admin-user-modal-super">
                  Super Admin
                </span>
              )}
            </div>

            <div className="admin-user-modal-body">
              <section className="admin-user-modal-section">
                <div className="admin-user-modal-section-title">
                  <Icon
                    name="user"
                    size={17}
                  />

                  <h4>
                    Account information
                  </h4>
                </div>

                <div className="admin-user-modal-grid">
                  <div className="admin-user-modal-field">
                    <span>User ID</span>
                    <strong>{selectedUser.userId}</strong>
                  </div>

                  <div className="admin-user-modal-field">
                    <span>Registered</span>
                    <strong>
                      {formatDate(selectedUser.createdAt)}
                    </strong>
                  </div>

                  <div className="admin-user-modal-field">
                    <span>Account status</span>
                    <strong>
                      {statusLabel(selectedStatus)}
                    </strong>
                  </div>

                  <div className="admin-user-modal-field">
                    <span>Subscription status</span>
                    <strong>
                      {selectedUser.subscriptionStatus || "-"}
                    </strong>
                  </div>
                </div>
              </section>

              <section className="admin-user-modal-section">
                <div className="admin-user-modal-section-title">
                  <Icon
                    name="users"
                    size={17}
                  />

                  <h4>
                    Workspace
                  </h4>
                </div>

                {selectedWorkspace
                  ? (
                    <div className="admin-user-modal-grid">
                      <div className="admin-user-modal-field wide">
                        <span>Workspace name</span>
                        <strong>
                          {selectedWorkspace.name}
                        </strong>
                      </div>

                      <div className="admin-user-modal-field">
                        <span>Type</span>
                        <strong>
                          {selectedWorkspace.type}
                        </strong>
                      </div>

                      <div className="admin-user-modal-field">
                        <span>Role</span>
                        <strong>
                          {selectedWorkspace.role || "NO ROLE"}
                        </strong>
                      </div>

                      <div className="admin-user-modal-field">
                        <span>Members</span>
                        <strong>
                          {selectedWorkspace.memberCount}
                        </strong>
                      </div>
                    </div>
                  )
                  : (
                    <div className="admin-user-modal-empty">
                      No active workspace.
                    </div>
                  )}
              </section>

              <section className="admin-user-modal-section">
                <div className="admin-user-modal-section-title">
                  <Icon
                    name="whatsapp"
                    size={17}
                  />

                  <h4>
                    Connections
                  </h4>
                </div>

                <div className="admin-user-modal-connections">
                  <span
                    className={
                      selectedWhatsappOnline
                        ?
                        "admin-channel-badge success"
                        :
                        "admin-channel-badge muted"
                    }
                  >
                    <Icon
                      name="whatsapp"
                      size={14}
                    />

                    WhatsApp{" "}
                    {selectedWhatsappOnline
                      ? "Connected"
                      : "Offline"}
                  </span>

                  <span
                    className={
                      selectedWorkspace?.googleConnected
                        ?
                        "admin-channel-badge success"
                        :
                        "admin-channel-badge muted"
                    }
                  >
                    <Icon
                      name="sheet"
                      size={14}
                    />

                    Google Sheet{" "}
                    {selectedWorkspace?.googleConnected
                      ? "Connected"
                      : "Not connected"}
                  </span>

                  {selectedSheetUrl && (
                    <a
                      className="admin-user-modal-sheet-link"
                      href={selectedSheetUrl}
                      target="_blank"
                      rel="noreferrer"
                    >
                      Open Google Sheet
                    </a>
                  )}
                </div>
              </section>

              <section className="admin-user-modal-section">
                <div className="admin-user-modal-section-title">
                  <Icon
                    name="shield"
                    size={17}
                  />

                  <h4>
                    Subscription package
                  </h4>
                </div>

                <label className="admin-user-modal-package">
                  <span>
                    Current plan
                  </span>

                  <select
                    value={selectedUser.package}
                    disabled={
                      selectedWorkspace?.role !== "OWNER"
                      ||
                      props.busyUserId === selectedUser.userId
                    }
                    onChange={
                      (event) => {
                        const nextPackage =
                          event.target.value as
                            WorkspacePackage;

                        setSelectedUser(
                          (current) =>
                            current
                              ? {
                                  ...current,
                                  package:nextPackage,
                                }
                              :
                              current,
                        );

                        void props.onUpdatePackage(
                          selectedUser.userId,
                          nextPackage,
                        );
                      }
                    }
                  >
                    {packageOptions.map(
                      (option) => (
                        <option
                          key={option.value}
                          value={option.value}
                        >
                          {option.label}
                        </option>
                      ),
                    )}
                  </select>

                  <small>
                    {selectedWorkspace?.role === "OWNER"
                      ?
                      packagePrice(selectedUser.package)
                      :
                      "Package inherited from workspace owner."}
                  </small>
                </label>
              </section>
            </div>

            <footer className="admin-user-modal-footer">
              <div className="admin-user-modal-standard-actions">
                <button
                  type="button"
                  className="admin-modal-button secondary"
                  disabled={
                    selectedWorkspace?.role !== "OWNER"
                    ||
                    props.busyUserId === selectedUser.userId
                    ||
                    !selectedWorkspace?.googleConnected
                  }
                  onClick={
                    () =>
                      runSelectedUserAction(
                        "google-sheet/upgrade",
                        "Google Sheet upgraded ikut package semasa.",
                        `Upgrade Google Sheet untuk ${selectedUser.email} ikut package ${selectedUser.package}? Sheet lama tidak dipadam.`,
                      )
                  }
                >
                  Upgrade Google Sheet
                </button>

                <button
                  type="button"
                  className="admin-modal-button secondary"
                  disabled={
                    selectedWorkspace?.role !== "OWNER"
                    ||
                    props.busyUserId === selectedUser.userId
                    ||
                    !(
                      selectedWorkspace?.whatsappCount
                      ??
                      0
                    )
                  }
                  onClick={
                    () =>
                      runSelectedUserAction(
                        "whatsapp/disconnect",
                        "WhatsApp pairing disconnected.",
                        `Disconnect WhatsApp bot untuk ${selectedUser.email}? User perlu pair semula selepas ini.`,
                      )
                  }
                >
                  Disconnect WhatsApp
                </button>
              </div>

              <div className="admin-user-modal-danger-actions">
                {selectedStatus === "DEACTIVATED"
                  ? (
                    <button
                      type="button"
                      className="admin-modal-button success"
                      disabled={
                        props.busyUserId === selectedUser.userId
                      }
                      onClick={
                        () =>
                          runSelectedUserAction(
                            "reactivate",
                            "User reactivated.",
                            `Reactivate ${selectedUser.email}?`,
                          )
                      }
                    >
                      Reactivate user
                    </button>
                  )
                  : (
                    <button
                      type="button"
                      className="admin-modal-button warning"
                      disabled={
                        props.busyUserId === selectedUser.userId
                        ||
                        selectedUser.isSuperAdmin
                      }
                      onClick={
                        () =>
                          runSelectedUserAction(
                            "deactivate",
                            "User deactivated.",
                            `Deactivate ${selectedUser.email}? Ini soft delete dan boleh reactivate semula.`,
                          )
                      }
                    >
                      Deactivate user
                    </button>
                  )}

                <button
                  type="button"
                  className="admin-modal-button danger"
                  disabled={
                    props.busyUserId === selectedUser.userId
                    ||
                    selectedUser.isSuperAdmin
                  }
                  onClick={
                    () =>
                      runSelectedUserAction(
                        "delete",
                        "User deleted.",
                        `Delete ${selectedUser.email}? Ini akan padam akaun user dan data berkaitan yang cascade. Tindakan ini tidak boleh undo.`,
                      )
                  }
                >
                  Delete user
                </button>
              </div>
            </footer>
          </section>
        </div>
      )}
    </section>
  );
}
