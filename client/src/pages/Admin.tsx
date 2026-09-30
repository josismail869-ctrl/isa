import { startLogin } from "@/const";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import {
  ArrowLeft,
  Check,
  Edit2,
  Loader2,
  Plus,
  ShieldCheck,
  Trash2,
  X,
} from "lucide-react";
import { useState, type FormEvent } from "react";
import { Link } from "wouter";
import { toast } from "sonner";

type DailyUpdateForm = {
  title: string;
  caption: string;
  imageUrl: string;
};

const emptyForm: DailyUpdateForm = { title: "", caption: "", imageUrl: "" };

export default function Admin() {
  const utils = trpc.useUtils();
  const { user, loading: authLoading } = useAuth();
  const loginConfigured = Boolean(
    import.meta.env.VITE_OAUTH_PORTAL_URL && import.meta.env.VITE_APP_ID
  );
  const [form, setForm] = useState<DailyUpdateForm>(emptyForm);
  const [editingId, setEditingId] = useState<number | null>(null);
  const memberships = trpc.admin.membershipRequests.useQuery(undefined, {
    retry: false,
  });
  const dailyUpdates = trpc.admin.dailyUpdates.useQuery(undefined, {
    retry: false,
  });

  const updateMembership = trpc.admin.updateMembershipStatus.useMutation({
    onSuccess: async () => {
      toast.success("Membership request updated.");
      await utils.admin.membershipRequests.invalidate();
    },
    onError: () => toast.error("Could not update this membership request."),
  });
  const createUpdate = trpc.admin.createDailyUpdate.useMutation({
    onSuccess: async () => {
      toast.success("Daily update published.");
      setForm(emptyForm);
      await Promise.all([
        utils.admin.dailyUpdates.invalidate(),
        utils.content.latestDailyUpdate.invalidate(),
      ]);
    },
    onError: () => toast.error("Could not publish the daily update."),
  });
  const saveUpdate = trpc.admin.updateDailyUpdate.useMutation({
    onSuccess: async () => {
      toast.success("Daily update saved.");
      setEditingId(null);
      setForm(emptyForm);
      await Promise.all([
        utils.admin.dailyUpdates.invalidate(),
        utils.content.latestDailyUpdate.invalidate(),
      ]);
    },
    onError: () => toast.error("Could not save the daily update."),
  });
  const removeUpdate = trpc.admin.deleteDailyUpdate.useMutation({
    onSuccess: async () => {
      toast.success("Daily update deleted.");
      await Promise.all([
        utils.admin.dailyUpdates.invalidate(),
        utils.content.latestDailyUpdate.invalidate(),
      ]);
    },
    onError: () => toast.error("Could not delete the daily update."),
  });

  const isLoading =
    authLoading || memberships.isLoading || dailyUpdates.isLoading;
  const requestError = memberships.error ?? dailyUpdates.error;

  const submitUpdate = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const input = {
      title: form.title.trim(),
      caption: form.caption.trim() || null,
      imageUrl: form.imageUrl.trim() || null,
    };
    if (editingId === null) createUpdate.mutate(input);
    else saveUpdate.mutate({ id: editingId, ...input });
  };

  const startEditing = (
    update: NonNullable<typeof dailyUpdates.data>[number]
  ) => {
    setEditingId(update.id);
    setForm({
      title: update.title,
      caption: update.caption ?? "",
      imageUrl: update.imageUrl ?? "",
    });
  };

  if (isLoading) {
    return (
      <main className="grid min-h-screen place-items-center bg-[#0a0a0a] text-gray-300">
        <Loader2 className="animate-spin" />
      </main>
    );
  }

  if (!user || requestError?.data?.code === "UNAUTHORIZED") {
    return (
      <main className="grid min-h-screen place-items-center bg-[#0a0a0a] px-6 text-center text-white">
        <div>
          <ShieldCheck className="mx-auto mb-4 text-blue-400" size={36} />
          <h1 className="mb-3 text-2xl font-bold">Admin sign in</h1>
          <p className="mb-6 text-gray-400">
            Sign in with the account configured as the site owner.
          </p>
          {!loginConfigured && (
            <p className="mb-5 max-w-md text-sm text-amber-300">
              OAuth sign-in is not configured. Set VITE_OAUTH_PORTAL_URL and
              VITE_APP_ID in the deployment environment.
            </p>
          )}
          <button
            disabled={!loginConfigured}
            onClick={() => startLogin()}
            className="rounded-lg bg-blue-600 px-5 py-3 font-bold hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Sign in
          </button>
        </div>
      </main>
    );
  }

  if (requestError?.data?.code === "FORBIDDEN") {
    return (
      <main className="grid min-h-screen place-items-center bg-[#0a0a0a] px-6 text-center text-white">
        <div>
          <ShieldCheck className="mx-auto mb-4 text-blue-400" size={36} />
          <h1 className="mb-3 text-2xl font-bold">Admin access required</h1>
          <p className="mb-6 text-gray-400">
            This account is not configured with administrator access.
          </p>
          <Link href="/" className="text-blue-400 hover:text-blue-300">
            Return to XORTRON
          </Link>
        </div>
      </main>
    );
  }

  if (requestError) {
    return (
      <main className="grid min-h-screen place-items-center bg-[#0a0a0a] px-6 text-center text-white">
        <div>
          <ShieldCheck className="mx-auto mb-4 text-blue-400" size={36} />
          <h1 className="mb-3 text-2xl font-bold">Admin console unavailable</h1>
          <p className="mb-6 text-gray-400">
            Could not load admin data. Check the server and database
            configuration, then refresh.
          </p>
          <Link href="/" className="text-blue-400 hover:text-blue-300">
            Return to XORTRON
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#0a0a0a] px-5 py-8 text-gray-100 sm:px-8">
      <div className="mx-auto max-w-6xl">
        <header className="mb-10 flex flex-wrap items-center justify-between gap-4 border-b border-white/10 pb-6">
          <div>
            <Link
              href="/"
              className="mb-3 inline-flex items-center gap-2 text-sm text-gray-400 hover:text-white"
            >
              <ArrowLeft size={16} /> Public site
            </Link>
            <h1 className="flex items-center gap-3 text-3xl font-bold">
              <ShieldCheck className="text-blue-400" /> Admin console
            </h1>
            <p className="mt-2 text-sm text-gray-400">
              Signed in as {user?.email ?? user?.name ?? "site administrator"}
            </p>
          </div>
        </header>

        <section className="mb-12 rounded-xl border border-blue-500/30 bg-blue-500/[0.06] p-6">
          <p className="font-mono text-xs tracking-widest text-blue-300">
            SITE SETTINGS
          </p>
          <h2 className="mt-2 text-2xl font-semibold">Owner and payment profile</h2>
          <p className="mt-2 text-sm text-gray-400">
            These details are displayed on the public payment section. Update
            the source configuration before production if the beneficiary or
            payment account changes.
          </p>
          <div className="mt-5 grid gap-3 sm:grid-cols-3">
            <div className="rounded-lg border border-white/10 bg-black/30 p-4">
              <span className="text-xs text-gray-500">Owner</span>
              <p className="mt-1 font-semibold">josismail869@gmail.com</p>
            </div>
            <div className="rounded-lg border border-white/10 bg-black/30 p-4">
              <span className="text-xs text-gray-500">Beneficiary</span>
              <p className="mt-1 font-semibold">MD EJAN CHOWDHURY</p>
            </div>
            <div className="rounded-lg border border-white/10 bg-black/30 p-4">
              <span className="text-xs text-gray-500">bKash / Nagad</span>
              <p className="mt-1 font-semibold">01863211541</p>
            </div>
          </div>
          <p className="mt-4 text-sm text-gray-400">
            MyBank account: <span className="font-semibold text-gray-200">514012122490</span>
          </p>
        </section>

        <section className="mb-12">
          <div className="mb-5 flex items-end justify-between gap-4">
            <div>
              <p className="font-mono text-xs tracking-widest text-blue-300">
                MEMBERS
              </p>
              <h2 className="mt-2 text-2xl font-semibold">
                Membership requests
              </h2>
            </div>
            <span className="text-sm text-gray-400">
              {memberships.data?.length ?? 0} total
            </span>
          </div>
          {!memberships.data?.length ? (
            <p className="rounded-xl border border-white/10 bg-white/[0.03] p-6 text-gray-400">
              No membership requests yet.
            </p>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-white/10">
              <table className="w-full min-w-[680px] text-left text-sm">
                <thead className="bg-white/[0.04] text-xs uppercase tracking-wider text-gray-400">
                  <tr>
                    <th className="px-4 py-3">Member</th>
                    <th className="px-4 py-3">Plan</th>
                    <th className="px-4 py-3">Requested</th>
                    <th className="px-4 py-3">Status / Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/10">
                  {memberships.data.map(request => (
                    <tr key={request.id}>
                      <td className="px-4 py-4">
                        <div>{request.userName ?? "Member"}</div>
                        <div className="text-xs text-gray-500">
                          {request.userEmail ?? `Member #${request.userId}`}
                        </div>
                      </td>
                      <td className="px-4 py-4 capitalize">{request.plan}</td>
                      <td className="px-4 py-4 text-gray-400">
                        {new Date(request.createdAt).toLocaleString()}
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-3">
                          <span className="capitalize text-gray-300">
                            {request.status}
                          </span>
                          {request.status === "pending" && (
                            <>
                              <button
                                aria-label="Approve request"
                                disabled={updateMembership.isPending}
                                onClick={() =>
                                  updateMembership.mutate({
                                    id: request.id,
                                    status: "approved",
                                  })
                                }
                                className="rounded-md bg-emerald-500/15 p-2 text-emerald-300 hover:bg-emerald-500/25 disabled:opacity-50"
                              >
                                <Check size={16} />
                              </button>
                              <button
                                aria-label="Reject request"
                                disabled={updateMembership.isPending}
                                onClick={() =>
                                  updateMembership.mutate({
                                    id: request.id,
                                    status: "rejected",
                                  })
                                }
                                className="rounded-md bg-red-500/15 p-2 text-red-300 hover:bg-red-500/25 disabled:opacity-50"
                              >
                                <X size={16} />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <section>
          <div className="mb-5">
            <p className="font-mono text-xs tracking-widest text-blue-300">
              PUBLISHED CONTENT
            </p>
            <h2 className="mt-2 text-2xl font-semibold">Daily updates</h2>
          </div>
          <form
            onSubmit={submitUpdate}
            className="mb-7 grid gap-4 rounded-xl border border-white/10 bg-white/[0.03] p-5 md:grid-cols-2"
          >
            <label className="text-sm text-gray-300">
              Title
              <input
                required
                maxLength={180}
                value={form.title}
                onChange={event =>
                  setForm({ ...form, title: event.target.value })
                }
                className="mt-2 w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2.5 text-white outline-none focus:border-blue-500"
              />
            </label>
            <label className="text-sm text-gray-300">
              Image URL
              <input
                type="url"
                value={form.imageUrl}
                onChange={event =>
                  setForm({ ...form, imageUrl: event.target.value })
                }
                placeholder="https://…"
                className="mt-2 w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2.5 text-white outline-none focus:border-blue-500"
              />
            </label>
            <label className="text-sm text-gray-300 md:col-span-2">
              Caption
              <textarea
                rows={3}
                maxLength={5000}
                value={form.caption}
                onChange={event =>
                  setForm({ ...form, caption: event.target.value })
                }
                className="mt-2 w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2.5 text-white outline-none focus:border-blue-500"
              />
            </label>
            <div className="flex flex-wrap gap-3 md:col-span-2">
              <button
                type="submit"
                disabled={createUpdate.isPending || saveUpdate.isPending}
                className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
              >
                {editingId === null ? <Plus size={16} /> : <Check size={16} />}
                {editingId === null ? "Publish update" : "Save changes"}
              </button>
              {editingId !== null && (
                <button
                  type="button"
                  onClick={() => {
                    setEditingId(null);
                    setForm(emptyForm);
                  }}
                  className="rounded-lg border border-white/15 px-4 py-2.5 text-gray-300 hover:bg-white/5"
                >
                  Cancel edit
                </button>
              )}
            </div>
          </form>
          <div className="grid gap-4 md:grid-cols-2">
            {dailyUpdates.data?.map(update => (
              <article
                key={update.id}
                className="overflow-hidden rounded-xl border border-white/10 bg-white/[0.03]"
              >
                {update.imageUrl && (
                  <img
                    src={update.imageUrl}
                    alt=""
                    className="h-44 w-full bg-black/30 object-cover"
                  />
                )}
                <div className="p-5">
                  <p className="font-mono text-xs text-gray-500">
                    {new Date(update.publishedAt).toLocaleString()}
                  </p>
                  <h3 className="mt-2 text-lg font-semibold">{update.title}</h3>
                  {update.caption && (
                    <p className="mt-2 whitespace-pre-wrap text-sm text-gray-400">
                      {update.caption}
                    </p>
                  )}
                  <div className="mt-4 flex gap-2">
                    <button
                      onClick={() => startEditing(update)}
                      className="inline-flex items-center gap-2 rounded-md border border-white/10 px-3 py-2 text-sm hover:bg-white/5"
                    >
                      <Edit2 size={14} /> Edit
                    </button>
                    <button
                      onClick={() => {
                        if (window.confirm("Delete this daily update?"))
                          removeUpdate.mutate({ id: update.id });
                      }}
                      disabled={removeUpdate.isPending}
                      className="inline-flex items-center gap-2 rounded-md border border-red-500/20 px-3 py-2 text-sm text-red-300 hover:bg-red-500/10 disabled:opacity-50"
                    >
                      <Trash2 size={14} /> Delete
                    </button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
