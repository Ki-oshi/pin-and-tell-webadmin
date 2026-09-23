import {
  AlertTriangle,
  Ban,
  MapPin,
  Users,
} from "lucide-react";

const stats = [
  {
    label:
      "Total Users",

    value:
      "—",

    description:
      "Registered accounts",

    icon:
      Users,
  },

  {
    label:
      "Total Pins",

    value:
      "—",

    description:
      "Published locations",

    icon:
      MapPin,
  },

  {
    label:
      "Pending Reports",

    value:
      "—",

    description:
      "Awaiting review",

    icon:
      AlertTriangle,
  },

  {
    label:
      "Active Bans",

    value:
      "—",

    description:
      "Current restrictions",

    icon:
      Ban,
  },
];

export default function AdminDashboardPage() {
  return (
    <div className="space-y-6">
      {/* Summary */}
      <section
        className="
          grid
          gap-3
          sm:grid-cols-2
          xl:grid-cols-4
        "
      >
        {stats.map(
          (stat) => {
            const Icon =
              stat.icon;

            return (
              <article
                key={
                  stat.label
                }
                className="
                  border
                  border-slate-200
                  bg-white
                  p-5
                "
              >
                <div
                  className="
                    flex
                    items-start
                    justify-between
                    gap-4
                  "
                >
                  <div>
                    <p
                      className="
                        text-xs
                        font-medium
                        text-slate-500
                      "
                    >
                      {
                        stat.label
                      }
                    </p>

                    <p
                      className="
                        mt-2
                        text-2xl
                        font-semibold
                        tracking-[-0.03em]
                        text-slate-950
                      "
                    >
                      {
                        stat.value
                      }
                    </p>

                    <p
                      className="
                        mt-1
                        text-[11px]
                        text-slate-400
                      "
                    >
                      {
                        stat.description
                      }
                    </p>
                  </div>

                  <div
                    className="
                      flex h-9 w-9
                      items-center
                      justify-center
                      rounded-lg
                      bg-[#A92F56]/[0.08]
                      text-[#A92F56]
                    "
                  >
                    <Icon
                      size={17}
                    />
                  </div>
                </div>
              </article>
            );
          },
        )}
      </section>

      {/* Main area */}
      <section
        className="
          grid
          gap-4
          xl:grid-cols-[minmax(0,1.6fr)_minmax(320px,0.7fr)]
        "
      >
        <article
          className="
            min-h-[420px]
            border
            border-slate-200
            bg-white
          "
        >
          <div
            className="
              flex
              items-center
              justify-between
              border-b
              border-slate-200
              px-5
              py-4
            "
          >
            <div>
              <h2
                className="
                  text-sm
                  font-semibold
                  text-slate-900
                "
              >
                Platform Activity
              </h2>

              <p
                className="
                  mt-1
                  text-xs
                  text-slate-500
                "
              >
                User, pin and trip activity over time.
              </p>
            </div>
          </div>

          <div
            className="
              flex h-[340px]
              items-center
              justify-center
              text-sm
              text-slate-400
            "
          >
            Activity chart will be connected next.
          </div>
        </article>

        <article
          className="
            min-h-[420px]
            border
            border-slate-200
            bg-white
          "
        >
          <div
            className="
              border-b
              border-slate-200
              px-5
              py-4
            "
          >
            <h2
              className="
                text-sm
                font-semibold
                text-slate-900
              "
            >
              Moderation Overview
            </h2>

            <p
              className="
                mt-1
                text-xs
                text-slate-500
              "
            >
              Items requiring administrator attention.
            </p>
          </div>

          <div
            className="
              divide-y
              divide-slate-100
              px-5
            "
          >
            {[
              "Pending reports",
              "Active bans",
              "Flagged pins",
              "Suspended users",
            ].map(
              (item) => (
                <div
                  key={
                    item
                  }
                  className="
                    flex
                    items-center
                    justify-between
                    py-4
                  "
                >
                  <span
                    className="
                      text-sm
                      text-slate-600
                    "
                  >
                    {item}
                  </span>

                  <span
                    className="
                      text-sm
                      font-semibold
                      text-slate-900
                    "
                  >
                    —
                  </span>
                </div>
              ),
            )}
          </div>
        </article>
      </section>

      {/* Bottom */}
      <section
        className="
          grid
          gap-4
          xl:grid-cols-2
        "
      >
        <article
          className="
            border
            border-slate-200
            bg-white
          "
        >
          <div
            className="
              border-b
              border-slate-200
              px-5
              py-4
            "
          >
            <h2
              className="
                text-sm
                font-semibold
                text-slate-900
              "
            >
              Recent Activity
            </h2>
          </div>

          <div
            className="
              flex h-44
              items-center
              justify-center
              text-sm
              text-slate-400
            "
          >
            No activity loaded yet.
          </div>
        </article>

        <article
          className="
            border
            border-slate-200
            bg-white
          "
        >
          <div
            className="
              border-b
              border-slate-200
              px-5
              py-4
            "
          >
            <h2
              className="
                text-sm
                font-semibold
                text-slate-900
              "
            >
              Recent Reports
            </h2>
          </div>

          <div
            className="
              flex h-44
              items-center
              justify-center
              text-sm
              text-slate-400
            "
          >
            No reports loaded yet.
          </div>
        </article>
      </section>
    </div>
  );
}