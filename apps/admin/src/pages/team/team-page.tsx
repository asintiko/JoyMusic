import { useNavigate, useSearch } from "@tanstack/react-router";
import { Link2, MoreHorizontal, Trash2, UserPlus } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
import { memberRoles, type Member, type MemberRole } from "@joymusic/shared";
import {
  Avatar,
  Badge,
  Button,
  Dialog,
  IconButton,
  Input,
  Select,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeaderCell,
  TableRow,
  Tooltip,
  useToast,
} from "@joymusic/ui";
import { RoleBadge } from "../../components/bits";
import { ConfirmDialog } from "../../components/confirm-dialog";
import { CopyButton } from "../../components/copy-button";
import { useFieldErrorText } from "../../components/field-error";
import { Menu, MenuContent, MenuItem, MenuTrigger } from "../../components/menu";
import { PageHeader } from "../../components/page";
import { ErrorPanel, TableSkeleton } from "../../components/states";
import { useI18n } from "../../i18n";
import { describeError } from "../../lib/api-errors";
import { errorText } from "../../lib/error-messages";
import { formatDate } from "../../lib/format";
import { inviteLink } from "../../lib/invite-link";
import { canChangeMember, can } from "../../lib/permissions";
import { useSession } from "../../lib/use-session";
import { validateEmail } from "../../lib/validators";
import { useInviteMember, useMembers, useRemoveMember, useUpdateMemberRole } from "../../queries";
import { Empty } from "../../components/empty";

function InviteDialog({
  open,
  onOpenChange,
  actorRole,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  actorRole: MemberRole | null;
}) {
  const { t } = useI18n();
  const fieldText = useFieldErrorText();
  const invite = useInviteMember();
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<MemberRole>("dj");
  const [touched, setTouched] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [link, setLink] = useState<string | null>(null);
  const roles = memberRoles.filter((entry) => actorRole === "owner" || entry !== "owner");

  const reset = () => {
    setEmail("");
    setRole("dj");
    setTouched(false);
    setError(null);
    setLink(null);
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setTouched(true);
    setError(null);
    if (validateEmail(email)) return;
    try {
      const result = await invite.mutateAsync({ email: email.trim(), role });
      setLink(inviteLink(result.inviteToken));
    } catch (failure) {
      setError(errorText(t, failure));
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) reset();
        onOpenChange(next);
      }}
      title={link ? t("team.invite.ready") : t("team.invite")}
      description={link ? t("team.invite.readyHint", { email }) : t("team.invite.hint")}
      closeLabel={t("common.close")}
      footer={
        link ? (
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={reset}>
              {t("team.invite.another")}
            </Button>
            <Button onClick={() => onOpenChange(false)}>{t("common.done")}</Button>
          </div>
        ) : (
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => onOpenChange(false)}>
              {t("common.cancel")}
            </Button>
            <Button
              type="submit"
              form="invite-form"
              loading={invite.isPending}
              leftIcon={<UserPlus aria-hidden="true" className="size-4" />}
            >
              {t("team.invite.send")}
            </Button>
          </div>
        )
      }
    >
      {link ? (
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-2 rounded-md bg-surface-2 py-1.5 pl-3 pr-1.5 hairline">
            <Link2 aria-hidden="true" className="size-4 shrink-0 text-brand" />
            <input
              readOnly
              aria-label={t("team.invite.link")}
              value={link}
              onFocus={(event) => event.currentTarget.select()}
              className="type-mono min-w-0 flex-1 bg-transparent text-[12.5px] text-fg outline-none"
            />
            <CopyButton value={link} label={t("team.invite.copyLink")} size="md" />
          </div>
          <p className="text-[12.5px] text-fg-subtle">{t("team.invite.expires")}</p>
        </div>
      ) : (
        <form id="invite-form" onSubmit={submit} noValidate className="flex flex-col gap-4">
          <Input
            label={t("auth.email")}
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            error={fieldText(touched ? validateEmail(email) : null)}
            placeholder="dj@venue.uz"
            autoFocus
          />
          <Select
            label={t("team.col.role")}
            value={role}
            onChange={(event) => setRole(event.target.value as MemberRole)}
            hint={t(`team.roleHint.${role}`)}
          >
            {roles.map((entry) => (
              <option key={entry} value={entry}>
                {t(`role.${entry}`)}
              </option>
            ))}
          </Select>
          {error ? (
            <p
              role="alert"
              className="rounded-md bg-danger-soft px-3 py-2.5 text-[13px] font-semibold text-danger-fg"
            >
              {error}
            </p>
          ) : null}
        </form>
      )}
    </Dialog>
  );
}

export function TeamPage() {
  const { t, locale } = useI18n();
  const toast = useToast();
  const navigate = useNavigate();
  const search = useSearch({ strict: false }) as { invite?: number };
  const state = useSession();
  const members = useMembers();
  const updateRole = useUpdateMemberRole();
  const removeMember = useRemoveMember();
  const [inviteOpen, setInviteOpen] = useState(false);
  const [removeTarget, setRemoveTarget] = useState<Member | null>(null);
  const [resend, setResend] = useState<Member | null>(null);
  const actorRole = state.role;
  const meId = state.me?.user.id;

  useEffect(() => {
    if (search.invite) {
      setInviteOpen(true);
      void navigate({ to: "/djs", search: {}, replace: true });
    }
  }, [search.invite, navigate]);

  const ownerCount = useMemo(
    () =>
      (members.data ?? []).filter((member) => member.role === "owner" && member.status === "active")
        .length,
    [members.data],
  );

  const changeRole = async (member: Member, role: MemberRole) => {
    if (role === member.role) return;
    try {
      await updateRole.mutateAsync({ id: member.id, role });
      toast.success(
        t("team.roleChanged", { name: member.name ?? member.email, role: t(`role.${role}`) }),
      );
    } catch (error) {
      toast.error(t("team.roleChangeFailed"), errorText(t, error));
    }
  };

  const confirmRemove = async () => {
    if (!removeTarget) return;
    const target = removeTarget;
    setRemoveTarget(null);
    try {
      await removeMember.mutateAsync(target.id);
      toast.success(
        target.status === "invited"
          ? t("team.inviteRevoked")
          : t("team.removed", { name: target.name ?? target.email }),
      );
    } catch (error) {
      const kind = describeError(error).kind;
      toast.error(
        kind === "last_owner" ? t("err.last_owner") : t("team.removeFailed"),
        kind === "last_owner" ? undefined : errorText(t, error),
      );
    }
  };

  const lockReason = (member: Member): string | null => {
    if (!can(actorRole, "manage-members")) return t("team.lock.permission");
    if (member.role === "owner" && actorRole !== "owner") return t("err.owner_only");
    if (member.role === "owner" && member.status === "active" && ownerCount <= 1)
      return t("err.last_owner");
    return null;
  };

  return (
    <>
      <PageHeader
        title={t("nav.djs")}
        description={t("team.subtitle")}
        actions={
          <Button
            leftIcon={<UserPlus aria-hidden="true" className="size-4" />}
            onClick={() => setInviteOpen(true)}
            disabled={!can(actorRole, "manage-members")}
          >
            {t("team.invite")}
          </Button>
        }
      />
      {members.isError ? (
        <ErrorPanel error={members.error} onRetry={() => void members.refetch()} />
      ) : members.isPending ? (
        <TableSkeleton rows={4} columns={5} />
      ) : members.data.length === 0 ? (
        <div className="rounded-lg bg-surface-1 hairline">
          <Empty
            size="lg"
            illustration="inbox"
            title={t("team.empty.title")}
            description={t("team.empty.description")}
          />
        </div>
      ) : (
        <Table aria-label={t("nav.djs")}>
          <TableHead>
            <TableRow interactive={false}>
              <TableHeaderCell>{t("team.col.member")}</TableHeaderCell>
              <TableHeaderCell>{t("team.col.role")}</TableHeaderCell>
              <TableHeaderCell>{t("team.col.status")}</TableHeaderCell>
              <TableHeaderCell>{t("team.col.joined")}</TableHeaderCell>
              <TableHeaderCell className="w-10">
                <span className="sr-only">{t("common.actions")}</span>
              </TableHeaderCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {members.data.map((member) => {
              const reason = lockReason(member);
              const isMe = member.userId === meId;
              const options = memberRoles.filter((role) =>
                canChangeMember(actorRole, member, role),
              );
              return (
                <TableRow key={member.id} data-testid="member-row">
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Avatar name={member.name ?? member.email} size={32} />
                      <div className="min-w-0 leading-tight">
                        <p className="truncate font-bold">
                          {member.name ?? member.email}
                          {isMe ? (
                            <span className="ml-2 text-[11px] font-semibold text-fg-subtle">
                              {t("team.you")}
                            </span>
                          ) : null}
                        </p>
                        {member.name ? (
                          <p className="truncate text-[12px] text-fg-muted">{member.email}</p>
                        ) : null}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    {reason || options.length === 0 ? (
                      <Tooltip content={reason ?? t("team.lock.permission")}>
                        <span className="inline-flex" tabIndex={0}>
                          <RoleBadge role={member.role} />
                        </span>
                      </Tooltip>
                    ) : (
                      <Select
                        aria-label={t("team.col.role")}
                        size="md"
                        value={member.role}
                        onChange={(event) =>
                          void changeRole(member, event.target.value as MemberRole)
                        }
                        wrapperClassName="w-[172px]"
                        className="h-9"
                      >
                        {options.map((role) => (
                          <option key={role} value={role}>
                            {t(`role.${role}`)}
                          </option>
                        ))}
                      </Select>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge size="sm" dot tone={member.status === "active" ? "playing" : "next"}>
                      {member.status === "active"
                        ? t("team.status.active")
                        : t("team.status.invited")}
                    </Badge>
                  </TableCell>
                  <TableCell muted>{formatDate(member.createdAt, locale)}</TableCell>
                  <TableCell>
                    <Menu>
                      <MenuTrigger asChild>
                        <IconButton
                          size="sm"
                          label={t("common.actions")}
                          icon={<MoreHorizontal aria-hidden="true" className="size-4" />}
                        />
                      </MenuTrigger>
                      <MenuContent align="end">
                        {member.status === "invited" ? (
                          <MenuItem
                            onSelect={() => setResend(member)}
                            disabled={!can(actorRole, "manage-members")}
                          >
                            <Link2 aria-hidden="true" />
                            {t("team.newLink")}
                          </MenuItem>
                        ) : null}
                        <MenuItem
                          tone="danger"
                          disabled={reason !== null || isMe}
                          onSelect={() => setRemoveTarget(member)}
                        >
                          <Trash2 aria-hidden="true" />
                          {member.status === "invited" ? t("team.revoke") : t("team.remove")}
                        </MenuItem>
                        {reason || isMe ? (
                          <p className="max-w-[240px] px-2.5 py-1.5 text-[11.5px] text-fg-subtle">
                            {isMe ? t("team.lock.self") : reason}
                          </p>
                        ) : null}
                      </MenuContent>
                    </Menu>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      )}
      {ownerCount === 1 ? (
        <p className="mt-3 text-[12.5px] text-fg-subtle">{t("team.lastOwnerNote")}</p>
      ) : null}

      <InviteDialog open={inviteOpen} onOpenChange={setInviteOpen} actorRole={actorRole} />
      <ResendDialog member={resend} onClose={() => setResend(null)} />
      <ConfirmDialog
        open={removeTarget !== null}
        onOpenChange={(open) => {
          if (!open) setRemoveTarget(null);
        }}
        title={
          removeTarget?.status === "invited"
            ? t("team.revoke.title")
            : t("team.remove.title", { name: removeTarget?.name ?? removeTarget?.email ?? "" })
        }
        description={
          removeTarget?.status === "invited"
            ? t("team.revoke.description")
            : t("team.remove.description")
        }
        confirmLabel={removeTarget?.status === "invited" ? t("team.revoke") : t("team.remove")}
        tone="danger"
        onConfirm={() => void confirmRemove()}
      />
    </>
  );
}

function ResendDialog({ member, onClose }: { member: Member | null; onClose: () => void }) {
  const { t } = useI18n();
  const invite = useInviteMember();
  const [link, setLink] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!member) {
      setLink(null);
      setError(null);
      return;
    }
    invite
      .mutateAsync({ email: member.email, role: member.role })
      .then((result) => setLink(inviteLink(result.inviteToken)))
      .catch((failure: unknown) => setError(errorText(t, failure)));
  }, [member?.id]);

  return (
    <Dialog
      open={member !== null}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
      title={t("team.invite.ready")}
      description={member ? t("team.invite.readyHint", { email: member.email }) : undefined}
      closeLabel={t("common.close")}
      footer={
        <div className="flex justify-end">
          <Button onClick={onClose}>{t("common.done")}</Button>
        </div>
      }
    >
      {error ? (
        <p
          role="alert"
          className="rounded-md bg-danger-soft px-3 py-2.5 text-[13px] font-semibold text-danger-fg"
        >
          {error}
        </p>
      ) : link ? (
        <div className="flex items-center gap-2 rounded-md bg-surface-2 py-1.5 pl-3 pr-1.5 hairline">
          <input
            readOnly
            aria-label={t("team.invite.link")}
            value={link}
            className="type-mono min-w-0 flex-1 bg-transparent text-[12.5px] outline-none"
          />
          <CopyButton value={link} label={t("team.invite.copyLink")} size="md" />
        </div>
      ) : (
        <p className="text-[13px] text-fg-muted">{t("common.loading")}</p>
      )}
    </Dialog>
  );
}
