import type {
  Metadata,
} from "next";

import {
  Car,
  ImageIcon,
  Link2,
  Star,
} from "lucide-react";

import VehiclesTable from "@/components/admin/vehicles/vehicles-table";

import {
  getVehiclesPageData,
} from "@/lib/admin/vehicles";

export const metadata:
  Metadata = {
  title:
    "Vehicles",
};

export const dynamic =
  "force-dynamic";

export const revalidate =
  0;

type Props = {
  searchParams: Promise<{
    q?:
      | string
      | string[];

    fuel?:
      | string
      | string[];

    primary?:
      | string
      | string[];

    sort?:
      | string
      | string[];

    page?:
      | string
      | string[];
  }>;
};

function firstValue(
  value:
    | string
    | string[]
    | undefined,
): string {
  if (
    Array.isArray(
      value,
    )
  ) {
    return (
      value[0] ??
      ""
    );
  }

  return (
    value ??
    ""
  );
}

function formatNumber(
  value:
    number | null,
): string {
  if (
    value === null
  ) {
    return "—";
  }

  return new Intl.NumberFormat(
    "en-US",
  ).format(
    value,
  );
}

export default async function VehiclesPage({
  searchParams,
}: Props) {
  const params =
    await searchParams;

  const query =
    firstValue(
      params.q,
    );

  const requestedFuel =
    firstValue(
      params.fuel,
    );

  const requestedPrimary =
    firstValue(
      params.primary,
    );

  const requestedSort =
    firstValue(
      params.sort,
    );

  const fuel =
    requestedFuel ||
    "all";

  const primary =
    [
      "all",
      "primary",
      "secondary",
    ].includes(
      requestedPrimary,
    )
      ? requestedPrimary
      : "all";

  const sort =
    [
      "newest",
      "oldest",
      "name",
    ].includes(
      requestedSort,
    )
      ? requestedSort
      : "newest";

  const pageValue =
    firstValue(
      params.page,
    );

  const parsedPage =
    /^\d+$/.test(
      pageValue,
    )
      ? Number(
          pageValue,
        )
      : 1;

  const page =
    Number.isSafeInteger(
      parsedPage,
    ) &&
    parsedPage >
      0
      ? parsedPage
      : 1;

  const data =
    await getVehiclesPageData(
      {
        page,

        search:
          query,

        fuel,

        primary,

        sort,
      },
    );

  /*
   * Only permit fuel types that
   * actually came from the DB.
   */
  const normalizedFuel =
    fuel === "all" ||
    data.fuelTypes.includes(
      fuel,
    )
      ? fuel
      : "all";

  const stats = [
    {
      label:
        "Registered Vehicles",

      value:
        data.stats.total,

      description:
        "All vehicles registered by users",

      icon:
        Car,

      style:
        "bg-[#A92F56]/[0.08] text-[#A92F56]",
    },

    {
      label:
        "Primary Vehicles",

      value:
        data.stats.primary,

      description:
        "Marked as the owner's primary vehicle",

      icon:
        Star,

      style:
        "bg-amber-50 text-amber-600",
    },

    {
      label:
        "Preset Linked",

      value:
        data.stats.presetLinked,

      description:
        "Vehicles associated with a preset",

      icon:
        Link2,

      style:
        "bg-blue-50 text-blue-600",
    },

    {
      label:
        "With Photos",

      value:
        data.stats.withImages,

      description:
        "Vehicles with an uploaded image",

      icon:
        ImageIcon,

      style:
        "bg-emerald-50 text-emerald-600",
    },
  ];

  return (
    <main className="space-y-6 pb-8">
      <header className="relative overflow-hidden rounded-3xl border border-rose-100 bg-white px-5 py-6 shadow-sm sm:px-7 sm:py-7">
        <div className="pointer-events-none absolute -right-16 -top-24 h-60 w-60 rounded-full bg-rose-100/50 blur-3xl" />
        <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-4">
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#A92F56]/10 text-[#A92F56]">
              <Car size={22} strokeWidth={1.8} />
            </span>
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.17em] text-[#A92F56]">Fleet oversight</p>
              <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-950 sm:text-[28px]">Vehicle Management</h1>
              <p className="mt-1.5 max-w-2xl text-xs leading-5 text-slate-500 sm:text-sm">
                Browse registered vehicles, owner details, fuel efficiency, and preset information.
              </p>
            </div>
          </div>
          <span className="inline-flex w-fit items-center gap-2 rounded-full border border-rose-100 bg-rose-50 px-3 py-1.5 text-[11px] font-semibold text-[#A92F56]">
            <Car size={13} /> {formatNumber(data.stats.total)} registered
          </span>
        </div>
      </header>

      {data.hasErrors && (
        <div role="alert" className="flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-xs leading-5 text-amber-800">
          <span className="mt-0.5 font-bold">!</span>
          Some vehicle, owner, or preset information could not be loaded. Check the server console for details.
        </div>
      )}

      <section aria-label="Vehicle statistics" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <article key={stat.label} className="group rounded-[22px] border border-slate-200/80 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-rose-200 hover:shadow-md">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-[12px] font-semibold text-slate-500">{stat.label}</p>
                  <p className="mt-3 text-[31px] font-bold leading-none tracking-[-0.045em] text-slate-950">{formatNumber(stat.value)}</p>
                </div>
                <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ${stat.style}`}>
                  <Icon size={19} strokeWidth={1.8} />
                </span>
              </div>
              <p className="mt-4 text-[11px] leading-5 text-slate-400">{stat.description}</p>
              <div className="mt-4 h-1 w-12 rounded-full bg-[#A92F56]/20 transition-all group-hover:w-20 group-hover:bg-[#A92F56]/70" />
            </article>
          );
        })}
      </section>

      <VehiclesTable
        key={`${query}-${normalizedFuel}-${primary}-${sort}-${page}`}
        vehicles={data.vehicles}
        fuelTypes={data.fuelTypes}
        pagination={data.pagination}
        initialQuery={query}
        initialFuel={normalizedFuel}
        initialPrimary={primary}
        initialSort={sort}
      />
    </main>
  );
}
