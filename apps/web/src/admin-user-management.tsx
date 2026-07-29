import React, {
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
      | "ban"
      | "unban"
      | "deactivate"
      | "reactivate"
      | "delete",
    label:string,
    confirmText:string,
  ) => Promise<void> | void;
};

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
    currentPage,
    setCurrentPage,
  ] =
    useState(
      1,
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
            const searchFields = [
              user.name,
              user.email,
              user.workspace?.name,
              user.workspace?.id,
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

            return (
              matchesSearch
              &&
              matchesPackage
            );
          },
        );
      },
      [
        props.users,
        query,
        packageFilter,
      ],
    );

  const activeUsers =
    props.users.filter(
      (user) =>
        user.subscriptionStatus
          .toUpperCase()
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

  const paginatedUsers =
    filteredUsers.slice(
      (
        safeCurrentPage
        -
        1
      )
      *
      pageSize,
      safeCurrentPage
      *
      pageSize,
    );

  return (
    <section className="admin-users-shell">
      <header className="admin-users-header">
        <div>
          <span className="admin-users-eyebrow">
            Super Admin
          </span>

          <h2>
            User Management
          </h2>

          <p>
            View registered accounts, workspace connections
            and manage packages safely.
          </p>
        </div>

        <button
          className="admin-users-refresh"
          type="button"
          onClick={props.onRefresh}
        >
          Refresh users
        </button>
      </header>

      <div className="admin-users-stats">
        <article>
          <span>Registered users</span>
          <strong>{props.users.length}</strong>
        </article>

        <article>
          <span>Active accounts</span>
          <strong>{activeUsers}</strong>
        </article>

        <article>
          <span>Google connected</span>
          <strong>{googleUsers}</strong>
        </article>

        <article>
          <span>WhatsApp online</span>
          <strong>{whatsappUsers}</strong>
        </article>
      </div>

      <div className="admin-users-toolbar">
        <label className="admin-users-search">
          <span>Search</span>

          <input
            type="search"
            value={query}
            placeholder="Name, email or workspace"
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

        <label className="admin-users-filter">
          <span>Package</span>

          <select
            value={packageFilter}
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
              All packages
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
      </div>

      {props.message && (
        <div className="admin-users-message">
          {props.message}
        </div>
      )}

      <div className="admin-users-count">
        Showing {paginatedUsers.length} of{" "}
        {filteredUsers.length} users
        {totalPages > 1
          ? ` · Page ${safeCurrentPage} / ${totalPages}`
          : ""}
      </div>

      {filteredUsers.length === 0
        ? (
          <div className="admin-users-empty">
            No registered users match this search.
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
                  <th>Actions</th>
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

                    const sheetUrl =
                      workspace?.spreadsheetId
                        ?
                        `https://docs.google.com/spreadsheets/d/${workspace.spreadsheetId}/edit`
                        :
                        "";

                    return (
                      <tr key={user.userId}>
                        <td>
                          <div className="admin-user-identity">
                            <span className="admin-user-avatar">
                              {initials(user)}
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
                                  {
                                    user.subscriptionStatus
                                  }
                                </em>
                              </div>
                            </div>
                          </div>
                        </td>

                        <td>
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

                        <td>
                          <div className="admin-connection-list">
                            <span
                              className={
                                workspace?.googleConnected
                                  ?
                                  "admin-connection ok"
                                  :
                                  "admin-connection off"
                              }
                            >
                              Google{" "}
                              {workspace?.googleConnected
                                ? "Connected"
                                : "Not connected"}
                            </span>

                            <span
                              className={
                                whatsappOnline
                                  ?
                                  "admin-connection ok"
                                  :
                                  "admin-connection off"
                              }
                            >
                              WhatsApp{" "}
                              {whatsappOnline
                                ? "Online"
                                : "Offline"}
                            </span>

                            {sheetUrl && (
                              <a
                                className="admin-sheet-link"
                                href={sheetUrl}
                                target="_blank"
                                rel="noreferrer"
                              >
                                Open Google Sheet
                              </a>
                            )}
                          </div>
                        </td>

                        <td>
                          <div className="admin-date-detail">
                            <strong>
                              {formatDate(user.createdAt)}
                            </strong>

                            <span>
                              ID: {user.userId.slice(0, 12)}…
                            </span>
                          </div>
                        </td>

                        <td>
                          <div className="admin-package-control compact">
                            <select
                              value={user.package}
                              disabled={
                                !isOwner
                                ||
                                isBusy
                              }
                              onChange={
                                (event) =>
                                  props.onUpdatePackage(
                                    user.userId,
                                    event.target.value as
                                      WorkspacePackage,
                                  )
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

                            <span>
                              {isBusy
                                ? "Updating…"
                                : isOwner
                                  ? packageLabel(user.package)
                                  : "Inherited"}
                            </span>
                          </div>
                        </td>

                        <td>
                          <details className="admin-action-menu">
                            <summary>
                              Actions
                            </summary>

                            <div className="admin-action-panel">
                              <div className="admin-action-status">
                                <span>Account status</span>

                                <strong
                                  className={
                                    user.status && user.status !== "ACTIVE"
                                      ? "admin-access-danger"
                                      : "admin-access-ok"
                                  }
                                >
                                  {user.status || "ACTIVE"}
                                </strong>
                              </div>

                              <button
                                type="button"
                                disabled={!isOwner || isBusy || !workspace?.googleConnected}
                                onClick={() => props.onSuperAdminUserAction(
                                  user.userId,
                                  "google-sheet/upgrade",
                                  "Google Sheet upgraded ikut package semasa.",
                                  `Upgrade Google Sheet untuk ${user.email} ikut package ${user.package}? Sheet lama tidak dipadam.`,
                                )}
                              >
                                Upgrade Sheet
                              </button>

                              <button
                                type="button"
                                disabled={!isOwner || isBusy || !workspace?.whatsappCount}
                                onClick={() => props.onSuperAdminUserAction(
                                  user.userId,
                                  "whatsapp/disconnect",
                                  "WhatsApp pairing disconnected.",
                                  `Disconnect WhatsApp bot untuk ${user.email}? User perlu pair semula selepas ini.`,
                                )}
                              >
                                Disconnect WA
                              </button>

                              {user.status === "BANNED"
                                ? (
                                  <button
                                    type="button"
                                    disabled={isBusy}
                                    onClick={() => props.onSuperAdminUserAction(
                                      user.userId,
                                      "unban",
                                      "User unbanned.",
                                      `Unban ${user.email}?`,
                                    )}
                                  >
                                    Unban user
                                  </button>
                                )
                                : (
                                  <button
                                    type="button"
                                    className="dangerGhost"
                                    disabled={isBusy || user.isSuperAdmin}
                                    onClick={() => props.onSuperAdminUserAction(
                                      user.userId,
                                      "ban",
                                      "User banned.",
                                      `Ban ${user.email}? User tidak boleh login selepas ini.`,
                                    )}
                                  >
                                    Ban user
                                  </button>
                                )}

                              {user.status === "DEACTIVATED"
                                ? (
                                  <button
                                    type="button"
                                    disabled={isBusy}
                                    onClick={() => props.onSuperAdminUserAction(
                                      user.userId,
                                      "reactivate",
                                      "User reactivated.",
                                      `Reactivate ${user.email}?`,
                                    )}
                                  >
                                    Reactivate user
                                  </button>
                                )
                                : (
                                  <button
                                    type="button"
                                    className="dangerGhost"
                                    disabled={isBusy || user.isSuperAdmin}
                                    onClick={() => props.onSuperAdminUserAction(
                                      user.userId,
                                      "deactivate",
                                      "User deactivated.",
                                      `Deactivate ${user.email}? Ini soft delete dan boleh reactivate semula.`,
                                    )}
                                  >
                                    Deactivate user
                                  </button>
                                )}

                              <button
                                type="button"
                                className="dangerGhost"
                                disabled={isBusy || user.isSuperAdmin}
                                onClick={() => props.onSuperAdminUserAction(
                                  user.userId,
                                  "delete",
                                  "User deleted.",
                                  `Delete ${user.email}? Ini akan padam akaun user dan data berkaitan yang cascade. Tindakan ini tidak boleh undo.`,
                                )}
                              >
                                Delete user
                              </button>
                            </div>
                          </details>
                        </td>
                      </tr>
                    );
                  },
                )}
              </tbody>
            </table>
          </div>
        )}

      {filteredUsers.length > pageSize && (
        <div className="admin-users-pagination">
          <button
            type="button"
            disabled={safeCurrentPage <= 1}
            onClick={() => setCurrentPage(safeCurrentPage - 1)}
          >
            Previous
          </button>

          <span>
            Page {safeCurrentPage} / {totalPages}
          </span>

          <button
            type="button"
            disabled={safeCurrentPage >= totalPages}
            onClick={() => setCurrentPage(safeCurrentPage + 1)}
          >
            Next
          </button>
        </div>
      )}
    </section>
  );
}
