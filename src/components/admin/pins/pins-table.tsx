"use client";

import Link from "next/link";

import {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  AlertTriangle,
  Check,
  Copy,
  Eye,
  Heart,
  ImageIcon,
  Map,
  MapPin,
  MessageCircle,
  Navigation,
  Search,
  ShieldCheck,
  User,
  X,
} from "lucide-react";

import {
  useSearchParams,
} from "next/navigation";

import {
  useRouter,
} from "nextjs-toploader/app";

import type {
  AdminPinRow,
} from "@/lib/admin/pins";

type PinsTableProps = {
  pins: AdminPinRow[];

  categories:
    string[];

  pagination: {
    page: number;
    pageSize: number;
    total: number;
    pageCount: number;
  };

  initialQuery:
    string;

  initialCategory:
    string;

  initialSort:
    string;
};

function formatDate(
  value:
    | string
    | null,
) {
  if (!value) {
    return "—";
  }

  const date =
    new Date(
      value,
    );

  if (
    Number.isNaN(
      date.getTime(),
    )
  ) {
    return "—";
  }

  return new Intl.DateTimeFormat(
    "en-PH",
    {
      month:
        "short",

      day:
        "numeric",

      year:
        "numeric",

      timeZone:
        "Asia/Manila",
    },
  ).format(date);
}

function formatDateTime(
  value:
    | string
    | null,
) {
  if (!value) {
    return "—";
  }

  const date =
    new Date(
      value,
    );

  if (
    Number.isNaN(
      date.getTime(),
    )
  ) {
    return "—";
  }

  return new Intl.DateTimeFormat(
    "en-PH",
    {
      month:
        "short",

      day:
        "numeric",

      year:
        "numeric",

      hour:
        "numeric",

      minute:
        "2-digit",

      timeZone:
        "Asia/Manila",
    },
  ).format(date);
}

function creatorName(
  pin:
    AdminPinRow,
) {
  return (
    pin.creator
      ?.full_name
      ?.trim() ||
    pin.creator
      ?.username
      ?.trim() ||
    pin.creator_email
      ?.trim() ||
    "Unknown user"
  );
}

function creatorInitials(
  pin:
    AdminPinRow,
) {
  return creatorName(
    pin,
  )
    .split(/\s+/)
    .map(
      (part) =>
        part[0],
    )
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function CategoryBadge({
  value,
}: {
  value:
    string | null;
}) {
  return (
    <span
      className="
        inline-flex
        border
        border-[#A92F56]/15
        bg-[#A92F56]/[0.06]
        px-2
        py-1
        text-[10px]
        font-semibold
        text-[#A92F56]
      "
    >
      {value ||
        "General"}
    </span>
  );
}

export default function PinsTable({
  pins,
  categories,
  pagination,
  initialQuery,
  initialCategory,
  initialSort,
}: PinsTableProps) {
  const router =
    useRouter();

  const searchParams =
    useSearchParams();

  const currentParams =
    searchParams.toString();

  const [
    query,
    setQuery,
  ] = useState(
    initialQuery,
  );

  const [
    selectedPin,
    setSelectedPin,
  ] =
    useState<
      AdminPinRow | null
    >(null);

  const [
    copied,
    setCopied,
  ] =
    useState<
      "id" |
      "coordinates" |
      null
    >(null);

  useEffect(() => {
    setQuery(
      initialQuery,
    );
  }, [
    initialQuery,
  ]);

  useEffect(() => {
    const timeout =
      window.setTimeout(
        () => {
          const params =
            new URLSearchParams(
              currentParams,
            );

          const cleaned =
            query.trim();

          if (
            cleaned
          ) {
            params.set(
              "q",
              cleaned,
            );
          } else {
            params.delete(
              "q",
            );
          }

          params.delete(
            "page",
          );

          const next =
            params.toString();

          if (
            next !==
            currentParams
          ) {
            router.replace(
              next
                ? `/admin/pins?${next}`
                : "/admin/pins",
            );
          }
        },
        350,
      );

    return () =>
      window.clearTimeout(
        timeout,
      );
  }, [
    query,
    currentParams,
    router,
  ]);

  useEffect(() => {
    if (
      !selectedPin
    ) {
      return;
    }

    const previous =
      document.body.style
        .overflow;

    document.body.style
      .overflow =
      "hidden";

    function closeOnEscape(
      event:
        KeyboardEvent,
    ) {
      if (
        event.key ===
        "Escape"
      ) {
        setSelectedPin(
          null,
        );
      }
    }

    document.addEventListener(
      "keydown",
      closeOnEscape,
    );

    return () => {
      document.body.style
        .overflow =
        previous;

      document.removeEventListener(
        "keydown",
        closeOnEscape,
      );
    };
  }, [
    selectedPin,
  ]);

  const showingText =
    useMemo(() => {
      if (
        pagination.total ===
        0
      ) {
        return "0 pins";
      }

      const start =
        (
          pagination.page -
          1
        ) *
          pagination.pageSize +
        1;

      const end =
        Math.min(
          pagination.page *
            pagination.pageSize,
          pagination.total,
        );

      return `${start}–${end} of ${pagination.total}`;
    }, [
      pagination,
    ]);

  function updateParam(
    key: string,
    value: string,
    defaultValue:
      string,
  ) {
    const params =
      new URLSearchParams(
        currentParams,
      );

    if (
      value ===
      defaultValue
    ) {
      params.delete(
        key,
      );
    } else {
      params.set(
        key,
        value,
      );
    }

    params.delete(
      "page",
    );

    const next =
      params.toString();

    router.replace(
      next
        ? `/admin/pins?${next}`
        : "/admin/pins",
    );
  }

  function pageUrl(
    page: number,
  ) {
    const params =
      new URLSearchParams(
        currentParams,
      );

    params.set(
      "page",
      String(page),
    );

    return `/admin/pins?${params.toString()}`;
  }

  async function copyValue(
    type:
      | "id"
      | "coordinates",
    value: string,
  ) {
    try {
      await navigator
        .clipboard
        .writeText(
          value,
        );

      setCopied(
        type,
      );

      window.setTimeout(
        () =>
          setCopied(
            null,
          ),
        1500,
      );
    } catch {
      setCopied(
        null,
      );
    }
  }

  return (
    <>
      <section
        className="
          border
          border-slate-200
          bg-white
        "
      >
        {/* Toolbar */}
        <div
          className="
            flex
            flex-col
            gap-3
            border-b
            border-slate-200
            p-4
            lg:flex-row
            lg:items-center
            lg:justify-between
          "
        >
          <div
            className="
              relative
              w-full
              lg:max-w-[380px]
            "
          >
            <Search
              size={15}
              className="
                pointer-events-none
                absolute
                left-3
                top-1/2
                -translate-y-1/2
                text-slate-400
              "
            />

            <input
              value={
                query
              }
              onChange={(
                event,
              ) =>
                setQuery(
                  event
                    .target
                    .value,
                )
              }
              placeholder="Search title, description, creator or subcategory..."
              className="
                h-10
                w-full
                border
                border-slate-200
                bg-white
                pl-9
                pr-9
                text-xs
                text-slate-800
                outline-none
                transition
                placeholder:text-slate-400
                hover:border-slate-300
                focus:border-[#CC3A67]
                focus:ring-2
                focus:ring-[#FDC1C9]/30
              "
            />

            {query && (
              <button
                type="button"
                onClick={() =>
                  setQuery(
                    "",
                  )
                }
                aria-label="Clear search"
                className="
                  absolute
                  right-2
                  top-1/2
                  flex
                  h-7
                  w-7
                  -translate-y-1/2
                  items-center
                  justify-center
                  text-slate-400
                  hover:text-slate-700
                "
              >
                <X
                  size={14}
                />
              </button>
            )}
          </div>

          <div
            className="
              flex
              flex-wrap
              items-center
              gap-2
            "
          >
            <select
              value={
                initialCategory
              }
              onChange={(
                event,
              ) =>
                updateParam(
                  "category",
                  event
                    .target
                    .value,
                  "all",
                )
              }
              className="
                h-10
                min-w-[150px]
                border
                border-slate-200
                bg-white
                px-3
                text-xs
                font-medium
                text-slate-600
                outline-none
                hover:border-slate-300
                focus:border-[#CC3A67]
              "
            >
              <option value="all">
                All categories
              </option>

              {categories.map(
                (
                  category,
                ) => (
                  <option
                    key={
                      category
                    }
                    value={
                      category
                    }
                  >
                    {
                      category
                    }
                  </option>
                ),
              )}
            </select>

            <select
              value={
                initialSort
              }
              onChange={(
                event,
              ) =>
                updateParam(
                  "sort",
                  event
                    .target
                    .value,
                  "newest",
                )
              }
              className="
                h-10
                min-w-[130px]
                border
                border-slate-200
                bg-white
                px-3
                text-xs
                font-medium
                text-slate-600
                outline-none
                hover:border-slate-300
                focus:border-[#CC3A67]
              "
            >
              <option value="newest">
                Newest first
              </option>

              <option value="oldest">
                Oldest first
              </option>

              <option value="title">
                Title A–Z
              </option>
            </select>

            <span
              className="
                hidden
                pl-1
                text-[11px]
                text-slate-400
                xl:block
              "
            >
              {showingText}
            </span>
          </div>
        </div>

        {/* Table */}
        {pins.length >
        0 ? (
          <div
            className="
              overflow-x-auto
            "
          >
            <table
              className="
                w-full
                min-w-[1050px]
                border-collapse
                text-left
              "
            >
              <thead>
                <tr
                  className="
                    border-b
                    border-slate-100
                    bg-slate-50/70
                  "
                >
                  {[
                    "Pin",
                    "Category",
                    "Creator",
                    "Engagement",
                    "Reports",
                    "Created",
                    "",
                  ].map(
                    (
                      heading,
                    ) => (
                      <th
                        key={
                          heading ||
                          "action"
                        }
                        className="
                          px-4
                          py-3
                          text-[10px]
                          font-semibold
                          uppercase
                          tracking-[0.08em]
                          text-slate-400
                          first:pl-5
                          last:pr-5
                        "
                      >
                        {
                          heading
                        }
                      </th>
                    ),
                  )}
                </tr>
              </thead>

              <tbody>
                {pins.map(
                  (pin) => (
                    <tr
                      key={
                        pin.id
                      }
                      className="
                        border-b
                        border-slate-100
                        transition-colors
                        last:border-b-0
                        hover:bg-slate-50/60
                      "
                    >
                      <td
                        className="
                          px-5
                          py-3.5
                        "
                      >
                        <div
                          className="
                            flex
                            items-center
                            gap-3
                          "
                        >
                          <div
                            className="
                              flex
                              h-9
                              w-9
                              shrink-0
                              items-center
                              justify-center
                              bg-[#A92F56]/[0.08]
                              text-[#A92F56]
                            "
                          >
                            <MapPin
                              size={16}
                            />
                          </div>

                          <div
                            className="
                              min-w-0
                            "
                          >
                            <p
                              className="
                                max-w-[260px]
                                truncate
                                text-xs
                                font-semibold
                                text-slate-900
                              "
                            >
                              {
                                pin.title
                              }
                            </p>

                            <p
                              className="
                                mt-0.5
                                max-w-[270px]
                                truncate
                                text-[10px]
                                text-slate-400
                              "
                            >
                              {pin.subcategory ||
                                `${pin.latitude.toFixed(
                                  5,
                                )}, ${pin.longitude.toFixed(
                                  5,
                                )}`}
                            </p>
                          </div>
                        </div>
                      </td>

                      <td
                        className="
                          px-4
                          py-3.5
                        "
                      >
                        <CategoryBadge
                          value={
                            pin.category
                          }
                        />
                      </td>

                      <td
                        className="
                          px-4
                          py-3.5
                        "
                      >
                        <div
                          className="
                            flex
                            items-center
                            gap-2.5
                          "
                        >
                          <div
                            className="
                              flex
                              h-7
                              w-7
                              shrink-0
                              items-center
                              justify-center
                              bg-slate-100
                              text-[9px]
                              font-semibold
                              text-slate-600
                            "
                          >
                            {creatorInitials(
                              pin,
                            )}
                          </div>

                          <div
                            className="
                              min-w-0
                            "
                          >
                            <p
                              className="
                                max-w-[150px]
                                truncate
                                text-[11px]
                                font-medium
                                text-slate-700
                              "
                            >
                              {creatorName(
                                pin,
                              )}
                            </p>

                            {pin.creator
                              ?.username && (
                              <p
                                className="
                                  mt-0.5
                                  truncate
                                  text-[9px]
                                  text-slate-400
                                "
                              >
                                @
                                {
                                  pin
                                    .creator
                                    .username
                                }
                              </p>
                            )}
                          </div>
                        </div>
                      </td>

                      <td
                        className="
                          px-4
                          py-3.5
                        "
                      >
                        <div
                          className="
                            flex
                            items-center
                            gap-4
                            text-[11px]
                            text-slate-500
                          "
                        >
                          <span
                            className="
                              flex
                              items-center
                              gap-1
                            "
                            title="Likes"
                          >
                            <Heart
                              size={12}
                            />

                            {
                              pin.likes_count
                            }
                          </span>

                          <span
                            className="
                              flex
                              items-center
                              gap-1
                            "
                            title="Comments"
                          >
                            <MessageCircle
                              size={12}
                            />

                            {
                              pin.comments_count
                            }
                          </span>

                          <span
                            className="
                              flex
                              items-center
                              gap-1
                            "
                            title="Vouches"
                          >
                            <ShieldCheck
                              size={12}
                            />

                            {
                              pin.vouches_count
                            }
                          </span>
                        </div>
                      </td>

                      <td
                        className="
                          px-4
                          py-3.5
                        "
                      >
                        {pin.open_reports_count >
                        0 ? (
                          <span
                            className="
                              inline-flex
                              items-center
                              gap-1.5
                              border
                              border-amber-200
                              bg-amber-50
                              px-2
                              py-1
                              text-[10px]
                              font-semibold
                              text-amber-700
                            "
                          >
                            <AlertTriangle
                              size={11}
                            />

                            {
                              pin.open_reports_count
                            }
                          </span>
                        ) : (
                          <span
                            className="
                              text-[11px]
                              text-slate-400
                            "
                          >
                            None
                          </span>
                        )}
                      </td>

                      <td
                        className="
                          px-4
                          py-3.5
                          text-[11px]
                          text-slate-500
                        "
                      >
                        {formatDate(
                          pin.created_at,
                        )}
                      </td>

                      <td
                        className="
                          px-5
                          py-3.5
                          text-right
                        "
                      >
                        <button
                          type="button"
                          onClick={() =>
                            setSelectedPin(
                              pin,
                            )
                          }
                          className="
                            inline-flex
                            h-8
                            items-center
                            gap-1.5
                            border
                            border-slate-200
                            px-2.5
                            text-[11px]
                            font-medium
                            text-slate-600
                            transition
                            hover:border-slate-300
                            hover:bg-slate-50
                            hover:text-slate-900
                          "
                        >
                          <Eye
                            size={13}
                          />

                          View
                        </button>
                      </td>
                    </tr>
                  ),
                )}
              </tbody>
            </table>
          </div>
        ) : (
          <div
            className="
              flex
              min-h-[320px]
              flex-col
              items-center
              justify-center
              px-6
              text-center
            "
          >
            <div
              className="
                flex
                h-11
                w-11
                items-center
                justify-center
                bg-slate-100
                text-slate-400
              "
            >
              <MapPin
                size={19}
              />
            </div>

            <p
              className="
                mt-4
                text-sm
                font-semibold
                text-slate-700
              "
            >
              No pins found
            </p>

            <p
              className="
                mt-1
                text-xs
                text-slate-400
              "
            >
              Try changing the
              search or category
              filter.
            </p>
          </div>
        )}

        {/* Pagination */}
        <div
          className="
            flex
            items-center
            justify-between
            border-t
            border-slate-200
            px-4
            py-3
            sm:px-5
          "
        >
          <p
            className="
              text-[11px]
              text-slate-400
            "
          >
            {showingText}
          </p>

          <div
            className="
              flex
              items-center
              gap-2
            "
          >
            {pagination.page >
            1 ? (
              <Link
                href={pageUrl(
                  pagination.page -
                    1,
                )}
                className="
                  border
                  border-slate-200
                  px-3
                  py-1.5
                  text-[11px]
                  font-medium
                  text-slate-600
                  hover:bg-slate-50
                "
              >
                Previous
              </Link>
            ) : (
              <span
                className="
                  border
                  border-slate-100
                  px-3
                  py-1.5
                  text-[11px]
                  text-slate-300
                "
              >
                Previous
              </span>
            )}

            <span
              className="
                px-2
                text-[11px]
                font-medium
                text-slate-500
              "
            >
              {
                pagination.page
              }
              {" / "}
              {
                pagination.pageCount
              }
            </span>

            {pagination.page <
            pagination.pageCount ? (
              <Link
                href={pageUrl(
                  pagination.page +
                    1,
                )}
                className="
                  border
                  border-slate-200
                  px-3
                  py-1.5
                  text-[11px]
                  font-medium
                  text-slate-600
                  hover:bg-slate-50
                "
              >
                Next
              </Link>
            ) : (
              <span
                className="
                  border
                  border-slate-100
                  px-3
                  py-1.5
                  text-[11px]
                  text-slate-300
                "
              >
                Next
              </span>
            )}
          </div>
        </div>
      </section>

      {/* Pin drawer */}
      {selectedPin && (
        <>
          <button
            type="button"
            aria-label="Close pin details"
            onClick={() =>
              setSelectedPin(
                null,
              )
            }
            className="
              fixed
              inset-0
              z-40
              bg-slate-950/20
              backdrop-blur-[1px]
            "
          />

          <aside
            className="
              fixed
              bottom-0
              right-0
              top-0
              z-50
              flex
              w-full
              max-w-[460px]
              flex-col
              border-l
              border-slate-200
              bg-white
              shadow-2xl
              shadow-slate-950/10
            "
          >
            <div
              className="
                flex
                h-[68px]
                shrink-0
                items-center
                justify-between
                border-b
                border-slate-200
                px-5
              "
            >
              <div>
                <p
                  className="
                    text-sm
                    font-semibold
                    text-slate-950
                  "
                >
                  Pin details
                </p>

                <p
                  className="
                    mt-0.5
                    text-[10px]
                    text-slate-400
                  "
                >
                  Pin #
                  {
                    selectedPin.id
                  }
                </p>
              </div>

              <button
                type="button"
                onClick={() =>
                  setSelectedPin(
                    null,
                  )
                }
                className="
                  flex
                  h-8
                  w-8
                  items-center
                  justify-center
                  border
                  border-slate-200
                  text-slate-400
                  hover:bg-slate-50
                  hover:text-slate-700
                "
                aria-label="Close"
              >
                <X
                  size={15}
                />
              </button>
            </div>

            <div
              className="
                flex-1
                overflow-y-auto
              "
            >
              {/* Photo */}
              {selectedPin.photo_url ? (
                <div
                  className="
                    border-b
                    border-slate-100
                    bg-slate-100
                  "
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={
                      selectedPin.photo_url
                    }
                    alt={
                      selectedPin.title
                    }
                    className="
                      h-[230px]
                      w-full
                      object-cover
                    "
                  />
                </div>
              ) : (
                <div
                  className="
                    flex
                    h-36
                    items-center
                    justify-center
                    border-b
                    border-slate-100
                    bg-slate-50
                    text-slate-300
                  "
                >
                  <ImageIcon
                    size={28}
                  />
                </div>
              )}

              {/* Main info */}
              <div
                className="
                  border-b
                  border-slate-100
                  px-5
                  py-5
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
                  <div
                    className="
                      min-w-0
                    "
                  >
                    <h2
                      className="
                        text-base
                        font-semibold
                        leading-6
                        text-slate-950
                      "
                    >
                      {
                        selectedPin.title
                      }
                    </h2>

                    <div
                      className="
                        mt-2
                        flex
                        flex-wrap
                        gap-2
                      "
                    >
                      <CategoryBadge
                        value={
                          selectedPin.category
                        }
                      />

                      {selectedPin.subcategory && (
                        <span
                          className="
                            border
                            border-slate-200
                            bg-slate-50
                            px-2
                            py-1
                            text-[10px]
                            font-medium
                            text-slate-500
                          "
                        >
                          {
                            selectedPin.subcategory
                          }
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <p
                  className="
                    mt-4
                    whitespace-pre-wrap
                    text-xs
                    leading-6
                    text-slate-600
                  "
                >
                  {selectedPin.description ||
                    "No description was provided."}
                </p>
              </div>

              {/* Engagement */}
              <div
                className="
                  border-b
                  border-slate-100
                  px-5
                  py-5
                "
              >
                <p
                  className="
                    mb-4
                    text-[10px]
                    font-bold
                    uppercase
                    tracking-[0.12em]
                    text-slate-400
                  "
                >
                  Engagement
                </p>

                <div
                  className="
                    grid
                    grid-cols-4
                    border
                    border-slate-200
                  "
                >
                  {[
                    {
                      label:
                        "Likes",
                      value:
                        selectedPin.likes_count,
                      icon:
                        Heart,
                    },

                    {
                      label:
                        "Comments",
                      value:
                        selectedPin.comments_count,
                      icon:
                        MessageCircle,
                    },

                    {
                      label:
                        "Vouches",
                      value:
                        selectedPin.vouches_count,
                      icon:
                        ShieldCheck,
                    },

                    {
                      label:
                        "Reports",
                      value:
                        selectedPin.open_reports_count,
                      icon:
                        AlertTriangle,
                    },
                  ].map(
                    (
                      metric,
                      index,
                    ) => {
                      const Icon =
                        metric.icon;

                      return (
                        <div
                          key={
                            metric.label
                          }
                          className={`
                            p-3
                            ${
                              index <
                              3
                                ? "border-r border-slate-200"
                                : ""
                            }
                          `}
                        >
                          <Icon
                            size={13}
                            className="
                              text-slate-400
                            "
                          />

                          <p
                            className="
                              mt-3
                              text-lg
                              font-semibold
                              text-slate-950
                            "
                          >
                            {
                              metric.value
                            }
                          </p>

                          <p
                            className="
                              mt-0.5
                              text-[9px]
                              text-slate-400
                            "
                          >
                            {
                              metric.label
                            }
                          </p>
                        </div>
                      );
                    },
                  )}
                </div>
              </div>

              {/* Creator */}
              <div
                className="
                  border-b
                  border-slate-100
                  px-5
                  py-5
                "
              >
                <p
                  className="
                    mb-4
                    text-[10px]
                    font-bold
                    uppercase
                    tracking-[0.12em]
                    text-slate-400
                  "
                >
                  Creator
                </p>

                <div
                  className="
                    flex
                    items-center
                    gap-3
                  "
                >
                  <div
                    className="
                      flex
                      h-10
                      w-10
                      shrink-0
                      items-center
                      justify-center
                      bg-[#72213A]/10
                      text-[10px]
                      font-semibold
                      text-[#72213A]
                    "
                  >
                    {creatorInitials(
                      selectedPin,
                    )}
                  </div>

                  <div
                    className="
                      min-w-0
                      flex-1
                    "
                  >
                    <p
                      className="
                        truncate
                        text-xs
                        font-semibold
                        text-slate-800
                      "
                    >
                      {creatorName(
                        selectedPin,
                      )}
                    </p>

                    <p
                      className="
                        mt-0.5
                        truncate
                        text-[10px]
                        text-slate-400
                      "
                    >
                      {selectedPin.creator
                        ?.username
                        ? `@${selectedPin.creator.username}`
                        : selectedPin.creator_email ||
                          "No additional creator information"}
                    </p>
                  </div>

                  {selectedPin.creator_id && (
                    <Link
                      href={`/admin/users?q=${encodeURIComponent(
                        selectedPin.creator_id,
                      )}`}
                      className="
                        text-[10px]
                        font-semibold
                        text-[#A92F56]
                        hover:text-[#72213A]
                      "
                    >
                      View user
                    </Link>
                  )}
                </div>
              </div>

              {/* Location */}
              <div
                className="
                  border-b
                  border-slate-100
                  px-5
                  py-5
                "
              >
                <p
                  className="
                    mb-4
                    text-[10px]
                    font-bold
                    uppercase
                    tracking-[0.12em]
                    text-slate-400
                  "
                >
                  Location
                </p>

                <div
                  className="
                    flex
                    items-start
                    gap-3
                  "
                >
                  <MapPin
                    size={16}
                    className="
                      mt-0.5
                      shrink-0
                      text-[#A92F56]
                    "
                  />

                  <div
                    className="
                      min-w-0
                      flex-1
                    "
                  >
                    <p
                      className="
                        font-mono
                        text-[11px]
                        text-slate-700
                      "
                    >
                      {selectedPin.latitude.toFixed(
                        6,
                      )}
                      {", "}
                      {selectedPin.longitude.toFixed(
                        6,
                      )}
                    </p>

                    <div
                      className="
                        mt-3
                        flex
                        flex-wrap
                        gap-2
                      "
                    >
                      <button
                        type="button"
                        onClick={() =>
                          copyValue(
                            "coordinates",
                            `${selectedPin.latitude}, ${selectedPin.longitude}`,
                          )
                        }
                        className="
                          inline-flex
                          h-8
                          items-center
                          gap-1.5
                          border
                          border-slate-200
                          px-2.5
                          text-[10px]
                          font-medium
                          text-slate-600
                          hover:bg-slate-50
                        "
                      >
                        {copied ===
                        "coordinates" ? (
                          <Check
                            size={12}
                          />
                        ) : (
                          <Copy
                            size={12}
                          />
                        )}

                        Copy coordinates
                      </button>

                      <a
                        href={`https://www.google.com/maps?q=${encodeURIComponent(
                          `${selectedPin.latitude},${selectedPin.longitude}`,
                        )}`}
                        target="_blank"
                        rel="noreferrer"
                        className="
                          inline-flex
                          h-8
                          items-center
                          gap-1.5
                          border
                          border-slate-200
                          px-2.5
                          text-[10px]
                          font-medium
                          text-slate-600
                          hover:bg-slate-50
                        "
                      >
                        <Navigation
                          size={12}
                        />

                        Open map
                      </a>
                    </div>
                  </div>
                </div>
              </div>

              {/* Record info */}
              <div
                className="
                  px-5
                  py-5
                "
              >
                <p
                  className="
                    mb-4
                    text-[10px]
                    font-bold
                    uppercase
                    tracking-[0.12em]
                    text-slate-400
                  "
                >
                  Record
                </p>

                <div
                  className="
                    space-y-4
                  "
                >
                  <div
                    className="
                      flex
                      items-center
                      justify-between
                      gap-3
                    "
                  >
                    <span
                      className="
                        text-xs
                        text-slate-500
                      "
                    >
                      Pin ID
                    </span>

                    <div
                      className="
                        flex
                        items-center
                        gap-2
                      "
                    >
                      <span
                        className="
                          font-mono
                          text-[11px]
                          text-slate-700
                        "
                      >
                        #
                        {
                          selectedPin.id
                        }
                      </span>

                      <button
                        type="button"
                        onClick={() =>
                          copyValue(
                            "id",
                            String(
                              selectedPin.id,
                            ),
                          )
                        }
                        className="
                          text-slate-400
                          hover:text-[#A92F56]
                        "
                      >
                        {copied ===
                        "id" ? (
                          <Check
                            size={12}
                          />
                        ) : (
                          <Copy
                            size={12}
                          />
                        )}
                      </button>
                    </div>
                  </div>

                  <div
                    className="
                      flex
                      items-center
                      justify-between
                      gap-3
                    "
                  >
                    <span
                      className="
                        text-xs
                        text-slate-500
                      "
                    >
                      Created
                    </span>

                    <span
                      className="
                        text-xs
                        font-medium
                        text-slate-700
                      "
                    >
                      {formatDateTime(
                        selectedPin.created_at,
                      )}
                    </span>
                  </div>
                </div>

                {selectedPin.open_reports_count >
                  0 && (
                  <Link
                    href={`/admin/reports?pin=${selectedPin.id}`}
                    className="
                      mt-5
                      flex
                      h-10
                      w-full
                      items-center
                      justify-center
                      gap-2
                      border
                      border-amber-200
                      bg-amber-50
                      text-xs
                      font-semibold
                      text-amber-700
                      transition
                      hover:bg-amber-100
                    "
                  >
                    <AlertTriangle
                      size={14}
                    />

                    Review associated
                    reports
                  </Link>
                )}
              </div>
            </div>
          </aside>
        </>
      )}
    </>
  );
}