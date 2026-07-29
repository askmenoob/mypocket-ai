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
              (event) =>
                setQuery(
                  event.target.value,
                )
            }
          />
        </label>

        <label className="admin-users-filter">
          <span>Package</span>

          <select
            value={packageFilter}
            onChange={
              (event) =>
                setPackageFilter(
                  event.target.value as
                    "ALL" | WorkspacePackage,
                )
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
        Showing {filteredUsers.length} of{" "}
        {props.users.length} users
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
                  <th>Package management</th>
                </tr>
              </thead>

              <tbody>
                {filteredUsers.map(
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
                          <div className="admin-package-control">
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
                                ? "Updating package…"
                                : isOwner
                                  ? `Current: ${packageLabel(user.package)}`
                                  : "Inherited from workspace owner"}
                            </span>
                          </div>
                        </td>
                      </tr>
                    );
                  },
                )}
              </tbody>
            </table>
          </div>
        )}
    </section>
  );
}
