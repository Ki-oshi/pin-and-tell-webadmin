"use client";

import Link from "next/link";

import {
  useEffect,
  useMemo,
  useState,
  useTransition,
} from "react";

import {
  AlertTriangle,
  Check,
  Copy,
  Eye,
  Flag,
  Heart,
  ImageIcon,
  Loader2,
  MapPin,
  MessageCircle,
  Navigation,
  Search,
  ShieldAlert,
  ShieldCheck,
  X,
} from "lucide-react";

import {
  useSearchParams,
} from "next/navigation";

import {
  useRouter,
} from "nextjs-toploader/app";

import {
  flagPinForReviewAction,
} from "@/app/admin/(protected)/reports/actions";

import type {
  FlagPinInput,
} from "@/app/admin/(protected)/reports/actions";

import type {
  AdminPinRow,
} from "@/lib/admin/pins";

type PinsTableProps = {
  pins: AdminPinRow[];

  categories: string[];

  pagination: {
    page: number;
    pageSize: number;
    total: number;
    pageCount: number;
  };

  initialQuery: string;
  initialCategory: string;
  initialSort: string;
};

type FlagType =
  FlagPinInput["type"];

type FeedbackMessage = {
  type:
    | "success"
    | "error";
  text: string;
};

const FLAG_TYPES: Array<{
  value: FlagType;
  label: string;
}> = [
  {
    value: "spam",
    label: "Spam",
  },
  {
    value: "harassment",
    label: "Harassment",
  },
  {
    value: "inappropriate",
    label: "Inappropriate",
  },
  {
    value: "copyright",
    label: "Copyright",
  },
  {
    value: "misinformation",
    label: "Misinformation",
  },
  {
    value: "other",
    label: "Other",
  },
];

function formatDate(
  value:
    | string
    | null,
) {
  if (!value) {
    return "—";
  }

  const date =
    new Date(value);

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
      month: "short",
      day: "numeric",
      year: "numeric",
      timeZone: "Asia/Manila",
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
    new Date(value);

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
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
      timeZone: "Asia/Manila",
    },
  ).format(date);
}

function creatorName(
  pin: AdminPinRow,
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
  pin: AdminPinRow,
) {
  return creatorName(pin)
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
      {value || "General"}
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
  ] = useState<
    AdminPinRow | null
  >(null);

  const [
    copied,
    setCopied,
  ] = useState<
    | "id"
    | "coordinates"
    | null
  >(null);

  const [
    flagPin,
    setFlagPin,
  ] = useState<
    AdminPinRow | null
  >(null);

  const [
    flagType,
    setFlagType,
  ] = useState<FlagType>(
    "inappropriate",
  );

  const [
    flagReason,
    setFlagReason,
  ] = useState("");

  const [
    flagDetails,
    setFlagDetails,
  ] = useState("");

  const [
    flagError,
    setFlagError,
  ] = useState<
    string | null
  >(null);

  const [
    feedback,
    setFeedback,
  ] = useState<
    FeedbackMessage | null
  >(null);

  const [
    locallyFlaggedPinIds,
    setLocallyFlaggedPinIds,
  ] = useState<Set<number>>(
    () => new Set<number>(),
  );

  const [
    isFlagging,
    startFlagTransition,
  ] = useTransition();

  useEffect(() => {
    const frame =
      window.requestAnimationFrame(
        () => {
          setQuery(
            initialQuery,
          );
        },
      );

    return () =>
      window.cancelAnimationFrame(
        frame,
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

          if (cleaned) {
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
      !selectedPin &&
      !flagPin
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
      event: KeyboardEvent,
    ) {
      if (
        event.key !==
        "Escape" ||
        isFlagging
      ) {
        return;
      }

      if (flagPin) {
        setFlagPin(null);
        setFlagError(null);
        return;
      }

      setSelectedPin(null);
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
    flagPin,
    isFlagging,
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

  function getOpenReportCount(
    pin: AdminPinRow,
  ) {
    return Math.max(
      pin.open_reports_count,
      locallyFlaggedPinIds.has(
        pin.id,
      )
        ? 1
        : 0,
    );
  }

  function isPinUnderReview(
    pin: AdminPinRow,
  ) {
    return (
      getOpenReportCount(
        pin,
      ) > 0
    );
  }

  function updateParam(
    key: string,
    value: string,
    defaultValue: string,
  ) {
    const params =
      new URLSearchParams(
        currentParams,
      );

    if (
      value ===
      defaultValue
    ) {
      params.delete(key);
    } else {
      params.set(
        key,
        value,
      );
    }

    params.delete("page");

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
        .writeText(value);

      setCopied(type);

      window.setTimeout(
        () =>
          setCopied(null),
        1500,
      );
    } catch {
      setCopied(null);
    }
  }

  function openFlagModal(
    pin: AdminPinRow,
  ) {
    if (
      isPinUnderReview(pin)
    ) {
      setFeedback({
        type: "error",
        text:
          `Pin #${pin.id} already has an open moderation report. Review the existing case instead of creating a duplicate.`,
      });

      return;
    }

    setFeedback(null);
    setFlagError(null);
    setFlagType(
      "inappropriate",
    );
    setFlagReason("");
    setFlagDetails("");
    setFlagPin(pin);
  }

  function closeFlagModal() {
    if (isFlagging) {
      return;
    }

    setFlagPin(null);
    setFlagError(null);
  }

  function submitFlag() {
    if (
      !flagPin ||
      isFlagging
    ) {
      return;
    }

    const cleanedReason =
      flagReason.trim();

    if (
      cleanedReason.length <
      3
    ) {
      setFlagError(
        "Please provide a clear reason for flagging this pin.",
      );

      return;
    }

    const pinToFlag =
      flagPin;

    setFlagError(null);
    setFeedback(null);

    startFlagTransition(
      async () => {
        const result =
          await flagPinForReviewAction(
            {
              pinId:
                pinToFlag.id,
              type:
                flagType,
              reason:
                cleanedReason,
              details:
                flagDetails.trim(),
            },
          );

        if (
          !result.success
        ) {
          setFlagError(
            result.message,
          );
          return;
        }

        setLocallyFlaggedPinIds(
          (current) => {
            const next =
              new Set(
                current,
              );

            next.add(
              pinToFlag.id,
            );

            return next;
          },
        );

        setFeedback({
          type: "success",
          text: result.message,
        });

        setFlagPin(null);
        setFlagReason("");
        setFlagDetails("");

        router.refresh();
      },
    );
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
        {feedback && (
          <div
            className={`
              flex
              items-start
              justify-between
              gap-4
              border-b
              px-4
              py-3
              text-xs
              ${
                feedback.type ===
                "success"
                  ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                  : "border-amber-200 bg-amber-50 text-amber-800"
              }
            `}
          >
            <div
              className="
                flex
                items-start
                gap-2
              "
            >
              {feedback.type ===
              "success" ? (
                <ShieldCheck
                  size={15}
                  className="
                    mt-0.5
                    shrink-0
                  "
                />
              ) : (
                <AlertTriangle
                  size={15}
                  className="
                    mt-0.5
                    shrink-0
                  "
                />
              )}

              <p>
                {feedback.text}
              </p>
            </div>

            <button
              type="button"
              onClick={() =>
                setFeedback(null)
              }
              className="
                shrink-0
                opacity-60
                transition
                hover:opacity-100
              "
              aria-label="Dismiss message"
            >
              <X size={14} />
            </button>
          </div>
        )}

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
              value={query}
              onChange={(
                event,
              ) =>
                setQuery(
                  event.target.value,
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
                  setQuery("")
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
                <X size={14} />
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
                  event.target.value,
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
                (category) => (
                  <option
                    key={category}
                    value={category}
                  >
                    {category}
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
                  event.target.value,
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
        {pins.length > 0 ? (
          <div
            className="
              overflow-x-auto
            "
          >
            <table
              className="
                w-full
                min-w-[1180px]
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
                    "Actions",
                  ].map(
                    (heading) => (
                      <th
                        key={heading}
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
                        {heading}
                      </th>
                    ),
                  )}
                </tr>
              </thead>

              <tbody>
                {pins.map(
                  (pin) => {
                    const openReportCount =
                      getOpenReportCount(
                        pin,
                      );

                    const underReview =
                      openReportCount >
                      0;

                    return (
                      <tr
                        key={pin.id}
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
                                {pin.title}
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
                                    pin.creator
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
                          {underReview ? (
                            <Link
                              href={`/admin/reports?pin=${pin.id}`}
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
                                transition
                                hover:bg-amber-100
                              "
                              title="Open associated reports"
                            >
                              <AlertTriangle
                                size={11}
                              />

                              {openReportCount}
                            </Link>
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
                          <div
                            className="
                              flex
                              items-center
                              justify-end
                              gap-2
                            "
                          >
                            {underReview ? (
                              <Link
                                href={`/admin/reports?pin=${pin.id}`}
                                className="
                                  inline-flex
                                  h-8
                                  items-center
                                  gap-1.5
                                  border
                                  border-amber-200
                                  bg-amber-50
                                  px-2.5
                                  text-[11px]
                                  font-medium
                                  text-amber-700
                                  transition
                                  hover:bg-amber-100
                                "
                              >
                                <ShieldAlert
                                  size={13}
                                />

                                Review
                              </Link>
                            ) : (
                              <button
                                type="button"
                                onClick={() =>
                                  openFlagModal(
                                    pin,
                                  )
                                }
                                className="
                                  inline-flex
                                  h-8
                                  items-center
                                  gap-1.5
                                  border
                                  border-[#FDC1C9]
                                  bg-[#FDC1C9]/10
                                  px-2.5
                                  text-[11px]
                                  font-medium
                                  text-[#A92F56]
                                  transition
                                  hover:bg-[#FDC1C9]/20
                                  hover:text-[#72213A]
                                "
                              >
                                <Flag
                                  size={13}
                                />

                                Flag
                              </button>
                            )}

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
                          </div>
                        </td>
                      </tr>
                    );
                  },
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
              {pagination.page}
              {" / "}
              {pagination.pageCount}
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
            onClick={() => {
              if (!flagPin) {
                setSelectedPin(null);
              }
            }}
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
                  Pin #{selectedPin.id}
                </p>
              </div>

              <button
                type="button"
                onClick={() =>
                  setSelectedPin(null)
                }
                disabled={
                  Boolean(flagPin)
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
                  disabled:cursor-not-allowed
                  disabled:opacity-40
                "
                aria-label="Close"
              >
                <X size={15} />
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
                      {selectedPin.title}
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
                      label: "Likes",
                      value:
                        selectedPin.likes_count,
                      icon: Heart,
                    },
                    {
                      label: "Comments",
                      value:
                        selectedPin.comments_count,
                      icon: MessageCircle,
                    },
                    {
                      label: "Vouches",
                      value:
                        selectedPin.vouches_count,
                      icon: ShieldCheck,
                    },
                    {
                      label: "Reports",
                      value:
                        getOpenReportCount(
                          selectedPin,
                        ),
                      icon: AlertTriangle,
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
                              index < 3
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
                            {metric.value}
                          </p>

                          <p
                            className="
                              mt-0.5
                              text-[9px]
                              text-slate-400
                            "
                          >
                            {metric.label}
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

              {/* Moderation */}
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
                    items-center
                    gap-2
                  "
                >
                  <ShieldAlert
                    size={14}
                    className="
                      text-[#A92F56]
                    "
                  />

                  <p
                    className="
                      text-[10px]
                      font-bold
                      uppercase
                      tracking-[0.12em]
                      text-slate-400
                    "
                  >
                    Moderation
                  </p>
                </div>

                {isPinUnderReview(
                  selectedPin,
                ) ? (
                  <div
                    className="
                      mt-4
                      border
                      border-amber-200
                      bg-amber-50/70
                      p-4
                    "
                  >
                    <div
                      className="
                        flex
                        items-start
                        gap-3
                      "
                    >
                      <AlertTriangle
                        size={16}
                        className="
                          mt-0.5
                          shrink-0
                          text-amber-600
                        "
                      />

                      <div>
                        <p
                          className="
                            text-xs
                            font-semibold
                            text-amber-800
                          "
                        >
                          Pin is already
                          under review
                        </p>

                        <p
                          className="
                            mt-1
                            text-[10px]
                            leading-5
                            text-amber-700
                          "
                        >
                          This pin has{" "}
                          {getOpenReportCount(
                            selectedPin,
                          )}{" "}
                          open moderation
                          report
                          {getOpenReportCount(
                            selectedPin,
                          ) === 1
                            ? ""
                            : "s"}
                          . Open the existing
                          case instead of
                          creating a duplicate.
                        </p>
                      </div>
                    </div>

                    <Link
                      href={`/admin/reports?pin=${selectedPin.id}`}
                      className="
                        mt-4
                        flex
                        h-10
                        w-full
                        items-center
                        justify-center
                        gap-2
                        border
                        border-amber-200
                        bg-white
                        text-xs
                        font-semibold
                        text-amber-700
                        transition
                        hover:bg-amber-100
                      "
                    >
                      <Eye
                        size={14}
                      />

                      Review associated
                      reports
                    </Link>
                  </div>
                ) : (
                  <div
                    className="
                      mt-4
                      border
                      border-slate-200
                      bg-slate-50/50
                      p-4
                    "
                  >
                    <p
                      className="
                        text-xs
                        font-semibold
                        text-slate-800
                      "
                    >
                      Flag this pin for
                      administrator review
                    </p>

                    <p
                      className="
                        mt-1
                        text-[10px]
                        leading-5
                        text-slate-500
                      "
                    >
                      Flagging creates a
                      pending moderation
                      report. It does not
                      automatically remove
                      the pin or punish the
                      creator.
                    </p>

                    <button
                      type="button"
                      onClick={() =>
                        openFlagModal(
                          selectedPin,
                        )
                      }
                      className="
                        mt-4
                        flex
                        h-10
                        w-full
                        items-center
                        justify-center
                        gap-2
                        border
                        border-[#FDC1C9]
                        bg-[#FDC1C9]/15
                        text-xs
                        font-semibold
                        text-[#A92F56]
                        transition
                        hover:bg-[#FDC1C9]/25
                        hover:text-[#72213A]
                      "
                    >
                      <Flag
                        size={14}
                      />

                      Flag Pin for Review
                    </button>
                  </div>
                )}
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
                        #{selectedPin.id}
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
                        aria-label="Copy pin ID"
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
                      Open reports
                    </span>

                    <span
                      className="
                        text-xs
                        font-semibold
                        text-slate-800
                      "
                    >
                      {getOpenReportCount(
                        selectedPin,
                      )}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </aside>
        </>
      )}

      {/* Flag pin modal */}
      {flagPin && (
        <>
          <button
            type="button"
            aria-label="Close flag pin dialog"
            onClick={
              closeFlagModal
            }
            disabled={
              isFlagging
            }
            className="
              fixed
              inset-0
              z-[60]
              bg-slate-950/35
              backdrop-blur-[1px]
              disabled:cursor-wait
            "
          />

          <div
            className="
              fixed
              inset-0
              z-[70]
              flex
              items-center
              justify-center
              p-4
              pointer-events-none
            "
          >
            <div
              role="dialog"
              aria-modal="true"
              aria-labelledby="flag-pin-title"
              className="
                pointer-events-auto
                w-full
                max-w-[520px]
                border
                border-slate-200
                bg-white
                shadow-2xl
                shadow-slate-950/15
              "
            >
              <div
                className="
                  flex
                  items-start
                  justify-between
                  gap-4
                  border-b
                  border-slate-200
                  px-5
                  py-4
                "
              >
                <div
                  className="
                    flex
                    items-start
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
                    <Flag
                      size={16}
                    />
                  </div>

                  <div>
                    <h2
                      id="flag-pin-title"
                      className="
                        text-sm
                        font-semibold
                        text-slate-950
                      "
                    >
                      Flag Pin for Review
                    </h2>

                    <p
                      className="
                        mt-1
                        text-[10px]
                        leading-4
                        text-slate-400
                      "
                    >
                      Create an administrative
                      moderation case for this
                      pin.
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={
                    closeFlagModal
                  }
                  disabled={
                    isFlagging
                  }
                  className="
                    flex
                    h-8
                    w-8
                    shrink-0
                    items-center
                    justify-center
                    border
                    border-slate-200
                    text-slate-400
                    transition
                    hover:bg-slate-50
                    hover:text-slate-700
                    disabled:cursor-not-allowed
                    disabled:opacity-40
                  "
                  aria-label="Close"
                >
                  <X size={15} />
                </button>
              </div>

              <div
                className="
                  max-h-[70vh]
                  overflow-y-auto
                  px-5
                  py-5
                "
              >
                <div
                  className="
                    border
                    border-slate-200
                    bg-slate-50/60
                    p-4
                  "
                >
                  <div
                    className="
                      flex
                      items-start
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
                        bg-white
                        text-[#A92F56]
                      "
                    >
                      <MapPin
                        size={15}
                      />
                    </div>

                    <div
                      className="
                        min-w-0
                      "
                    >
                      <p
                        className="
                          truncate
                          text-xs
                          font-semibold
                          text-slate-900
                        "
                      >
                        {flagPin.title}
                      </p>

                      <p
                        className="
                          mt-1
                          text-[10px]
                          text-slate-400
                        "
                      >
                        Pin #{flagPin.id}
                        {" · "}
                        {creatorName(
                          flagPin,
                        )}
                      </p>
                    </div>
                  </div>
                </div>

                {flagError && (
                  <div
                    className="
                      mt-4
                      flex
                      items-start
                      gap-2
                      border
                      border-red-200
                      bg-red-50
                      px-3
                      py-2.5
                      text-xs
                      text-red-700
                    "
                  >
                    <AlertTriangle
                      size={14}
                      className="
                        mt-0.5
                        shrink-0
                      "
                    />

                    <p>
                      {flagError}
                    </p>
                  </div>
                )}

                <div
                  className="
                    mt-5
                  "
                >
                  <label
                    htmlFor="flag-type"
                    className="
                      text-[10px]
                      font-semibold
                      uppercase
                      tracking-[0.08em]
                      text-slate-500
                    "
                  >
                    Report type
                  </label>

                  <select
                    id="flag-type"
                    value={flagType}
                    onChange={(
                      event,
                    ) =>
                      setFlagType(
                        event.target.value as FlagType,
                      )
                    }
                    disabled={
                      isFlagging
                    }
                    className="
                      mt-2
                      h-10
                      w-full
                      border
                      border-slate-200
                      bg-white
                      px-3
                      text-xs
                      text-slate-700
                      outline-none
                      transition
                      hover:border-slate-300
                      focus:border-[#CC3A67]
                      focus:ring-2
                      focus:ring-[#FDC1C9]/30
                      disabled:cursor-not-allowed
                      disabled:bg-slate-50
                    "
                  >
                    {FLAG_TYPES.map(
                      (option) => (
                        <option
                          key={
                            option.value
                          }
                          value={
                            option.value
                          }
                        >
                          {option.label}
                        </option>
                      ),
                    )}
                  </select>
                </div>

                <div
                  className="
                    mt-4
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
                    <label
                      htmlFor="flag-reason"
                      className="
                        text-[10px]
                        font-semibold
                        uppercase
                        tracking-[0.08em]
                        text-slate-500
                      "
                    >
                      Reason
                    </label>

                    <span
                      className="
                        text-[9px]
                        text-slate-400
                      "
                    >
                      {flagReason.length}/200
                    </span>
                  </div>

                  <input
                    id="flag-reason"
                    value={flagReason}
                    onChange={(
                      event,
                    ) => {
                      setFlagReason(
                        event.target.value,
                      );

                      if (flagError) {
                        setFlagError(null);
                      }
                    }}
                    maxLength={200}
                    disabled={
                      isFlagging
                    }
                    placeholder="Example: Misleading location information"
                    className="
                      mt-2
                      h-10
                      w-full
                      border
                      border-slate-200
                      bg-white
                      px-3
                      text-xs
                      text-slate-700
                      outline-none
                      transition
                      placeholder:text-slate-400
                      hover:border-slate-300
                      focus:border-[#CC3A67]
                      focus:ring-2
                      focus:ring-[#FDC1C9]/30
                      disabled:cursor-not-allowed
                      disabled:bg-slate-50
                    "
                  />

                  <p
                    className="
                      mt-1.5
                      text-[9px]
                      leading-4
                      text-slate-400
                    "
                  >
                    Give reviewers a short,
                    specific explanation of
                    why this pin requires
                    moderation.
                  </p>
                </div>

                <div
                  className="
                    mt-4
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
                    <label
                      htmlFor="flag-details"
                      className="
                        text-[10px]
                        font-semibold
                        uppercase
                        tracking-[0.08em]
                        text-slate-500
                      "
                    >
                      Additional details
                    </label>

                    <span
                      className="
                        text-[9px]
                        text-slate-400
                      "
                    >
                      Optional · {flagDetails.length}/2000
                    </span>
                  </div>

                  <textarea
                    id="flag-details"
                    value={flagDetails}
                    onChange={(
                      event,
                    ) =>
                      setFlagDetails(
                        event.target.value,
                      )
                    }
                    maxLength={2000}
                    rows={5}
                    disabled={
                      isFlagging
                    }
                    placeholder="Add context, evidence, or instructions for the administrator reviewing this case..."
                    className="
                      mt-2
                      w-full
                      resize-y
                      border
                      border-slate-200
                      bg-white
                      px-3
                      py-3
                      text-xs
                      leading-5
                      text-slate-700
                      outline-none
                      transition
                      placeholder:text-slate-400
                      hover:border-slate-300
                      focus:border-[#CC3A67]
                      focus:ring-2
                      focus:ring-[#FDC1C9]/30
                      disabled:cursor-not-allowed
                      disabled:bg-slate-50
                    "
                  />
                </div>

                <div
                  className="
                    mt-4
                    flex
                    items-start
                    gap-2
                    border
                    border-blue-200
                    bg-blue-50/70
                    px-3
                    py-2.5
                  "
                >
                  <ShieldAlert
                    size={14}
                    className="
                      mt-0.5
                      shrink-0
                      text-blue-600
                    "
                  />

                  <p
                    className="
                      text-[10px]
                      leading-5
                      text-blue-700
                    "
                  >
                    This action creates a
                    pending report and sends
                    the pin to the Reports
                    moderation queue. It does
                    not automatically delete
                    the pin or suspend its
                    creator.
                  </p>
                </div>
              </div>

              <div
                className="
                  flex
                  items-center
                  justify-end
                  gap-2
                  border-t
                  border-slate-200
                  bg-slate-50/50
                  px-5
                  py-4
                "
              >
                <button
                  type="button"
                  onClick={
                    closeFlagModal
                  }
                  disabled={
                    isFlagging
                  }
                  className="
                    inline-flex
                    h-10
                    items-center
                    justify-center
                    border
                    border-slate-200
                    bg-white
                    px-4
                    text-xs
                    font-semibold
                    text-slate-600
                    transition
                    hover:bg-slate-50
                    disabled:cursor-not-allowed
                    disabled:opacity-50
                  "
                >
                  Cancel
                </button>

                <button
                  type="button"
                  onClick={
                    submitFlag
                  }
                  disabled={
                    isFlagging ||
                    flagReason.trim()
                      .length < 3
                  }
                  className="
                    inline-flex
                    h-10
                    items-center
                    justify-center
                    gap-2
                    bg-[#A92F56]
                    px-4
                    text-xs
                    font-semibold
                    text-white
                    transition
                    hover:bg-[#72213A]
                    disabled:cursor-not-allowed
                    disabled:opacity-50
                  "
                >
                  {isFlagging ? (
                    <Loader2
                      size={14}
                      className="
                        animate-spin
                      "
                    />
                  ) : (
                    <Flag
                      size={14}
                    />
                  )}

                  {isFlagging
                    ? "Flagging..."
                    : "Flag Pin"}
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </>
  );
}