import {
  requireAdmin,
} from "@/lib/auth/session";

import {
  logoutAction,
} from "./actions";

export default async function AdminDashboardPage() {
  const admin =
    await requireAdmin();

  return (
    <main
      className="
        min-h-screen
        bg-slate-50
        p-8
      "
    >
      <div
        className="
          mx-auto
          max-w-5xl
        "
      >
        <div
          className="
            rounded-2xl
            border
            border-slate-200
            bg-white
            p-8
          "
        >
          <p
            className="
              text-sm
              font-medium
              text-[#A92F56]
            "
          >
            Authentication successful
          </p>

          <h1
            className="
              mt-2
              text-3xl
              font-bold
              text-slate-900
            "
          >
            Welcome,{" "}
            {admin.full_name ||
              "Admin"}
          </h1>

          <div
            className="
              mt-6
              space-y-2
              text-sm
              text-slate-600
            "
          >
            <p>
              <strong>Email:</strong>{" "}
              {admin.email}
            </p>

            <p>
              <strong>Role:</strong>{" "}
              {admin.role}
            </p>

            <p>
              <strong>Status:</strong>{" "}
              {admin.status}
            </p>
          </div>

          <form
            action={logoutAction}
            className="mt-8"
          >
            <button
              type="submit"
              className="
                rounded-xl
                bg-[#72213A]
                px-5
                py-3
                font-semibold
                text-white
                hover:bg-[#A92F56]
              "
            >
              Log Out
            </button>
          </form>
        </div>
      </div>
    </main>
  );
}