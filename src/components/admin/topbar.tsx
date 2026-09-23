"use client";



import Link from "next/link";



import {

  useEffect,

  useMemo,

  useRef,

  useState,

  useTransition,

} from "react";



import {

  AlertTriangle,

  Bell,

  ChevronDown,

  FileText,

  LogOut,

  Menu,

  Search,

  Settings,

  X,

} from "lucide-react";



import {

  usePathname,

} from "next/navigation";



import {

  useRouter,

} from "nextjs-toploader/app";



import {

  logoutAction,

} from "@/app/admin/(protected)/actions";



import LogoutConfirmModal from "@/components/admin/logout-confirm-modal";



import type {

  AdminTopbarData,

} from "@/lib/admin/topbar";



type AdminInfo = {

  id: string;

  email: string;

  full_name: string | null;

  role: string;

};



type TopbarProps = {

  admin: AdminInfo;



  topbarData:

    AdminTopbarData;



  onMenuClick:

    () => void;

};



type NavigationEntry = {

  title: string;

  description: string;

  href: string;

  keywords: string[];

};



const navigation: NavigationEntry[] = [

  {

    title: "Dashboard",

    description:

      "Platform overview and administrative activity.",

    href: "/admin",

    keywords: [

      "dashboard",

      "overview",

      "home",

      "statistics",

    ],

  },



  {

    title: "Users",

    description:

      "Manage registered PIN&TELL accounts.",

    href: "/admin/users",

    keywords: [

      "users",

      "profiles",

      "accounts",

      "members",

    ],

  },



  {

    title: "Pins",

    description:

      "Review community pins and location content.",

    href: "/admin/pins",

    keywords: [

      "pins",

      "posts",

      "locations",

      "map",

    ],

  },



  {

    title: "Reports",

    description:

      "Review reports and moderation cases.",

    href: "/admin/reports",

    keywords: [

      "reports",

      "moderation",

      "flagged",

      "review",

    ],

  },



  {

    title: "Ban Management",

    description:

      "Manage account restrictions and bans.",

    href: "/admin/bans",

    keywords: [

      "bans",

      "blocked",

      "suspended",

      "restrictions",

    ],

  },



  {

    title: "Trips",

    description:

      "Review mileage and eco-driving activity.",

    href: "/admin/trips",

    keywords: [

      "trips",

      "mileage",

      "eco",

      "driving",

    ],

  },



  {

    title: "Vehicles",

    description:

      "Review registered user vehicles.",

    href: "/admin/vehicles",

    keywords: [

      "vehicles",

      "cars",

      "motorcycles",

    ],

  },



  {

    title: "Fuel Logs",

    description:

      "Review fuel usage and efficiency.",

    href: "/admin/fuel-logs",

    keywords: [

      "fuel",

      "logs",

      "consumption",

      "efficiency",

    ],

  },



  {

    title: "Activity Logs",

    description:

      "Review security and administrative activity.",

    href: "/admin/activity-logs",

    keywords: [

      "logs",

      "activity",

      "audit",

      "security",

    ],

  },



  {

    title: "Platform Settings",

    description:

      "Manage PIN&TELL system configuration.",

    href: "/admin/settings",

    keywords: [

      "settings",

      "configuration",

      "system",

      "platform",

    ],

  },

];



const pageTitles =

  Object.fromEntries(

    navigation.map(

      (item) => [

        item.href,

        {

          title:

            item.title,



          description:

            item.description,

        },

      ],

    ),

  );



function getPageInfo(

  pathname: string,

) {

  if (

    pageTitles[

      pathname

    ]

  ) {

    return pageTitles[

      pathname

    ];

  }



  const matchingPath =

    Object.keys(

      pageTitles,

    )

      .filter(

        (route) =>

          route !==

            "/admin" &&

          pathname.startsWith(

            `${route}/`,

          ),

      )

      .sort(

        (a, b) =>

          b.length -

          a.length,

      )[0];



  return matchingPath

    ? pageTitles[

        matchingPath

      ]

    : {

        title:

          "Administration",



        description:

          "PIN&TELL management console.",

      };

}



function formatRelativeTime(

  value: string | null,

) {

  if (!value) {

    return "";

  }



  const time =

    new Date(

      value,

    ).getTime();



  if (

    !Number.isFinite(

      time,

    )

  ) {

    return "";

  }



  const difference =

    Date.now() -

    time;



  const minute =

    60_000;



  const hour =

    60 * minute;



  const day =

    24 * hour;



  if (

    difference <

    minute

  ) {

    return "Now";

  }



  if (

    difference <

    hour

  ) {

    return `${Math.floor(

      difference /

        minute,

    )}m`;

  }



  if (

    difference <

    day

  ) {

    return `${Math.floor(

      difference /

        hour,

    )}h`;

  }



  return `${Math.floor(

    difference /

      day,

  )}d`;

}



function formatLabel(

  value: string,

) {

  return value

    .replace(

      /_/g,

      " ",

    )

    .replace(

      /\b\w/g,

      (character) =>

        character.toUpperCase(),

    );

}



export default function Topbar({

  admin,

  topbarData,

  onMenuClick,

}: TopbarProps) {

  const pathname =

    usePathname();



  const router =

    useRouter();



  const page =

    getPageInfo(

      pathname,

    );



  const [

    searchQuery,

    setSearchQuery,

  ] = useState("");



  const [

    searchOpen,

    setSearchOpen,

  ] = useState(false);



  const [

    notificationsOpen,

    setNotificationsOpen,

  ] = useState(false);



  const [

    accountOpen,

    setAccountOpen,

  ] = useState(false);



  const [

    logoutOpen,

    setLogoutOpen,

  ] = useState(false);



  const [

    logoutPending,

    startLogoutTransition,

  ] = useTransition();



  const searchRef =

    useRef<HTMLDivElement>(

      null,

    );



  const notificationRef =

    useRef<HTMLDivElement>(

      null,

    );



  const accountRef =

    useRef<HTMLDivElement>(

      null,

    );



  const inputRef =

    useRef<HTMLInputElement>(

      null,

    );



  const displayName =

    admin.full_name

      ?.trim() ||

    admin.email;



  const initials =

    displayName

      .split(/\s+/)

      .map(

        (part) =>

          part[0],

      )

      .join("")

      .slice(0, 2)

      .toUpperCase();



  const results =

    useMemo(() => {

      const query =

        searchQuery

          .trim()

          .toLowerCase();



      if (!query) {

        return navigation.slice(

          0,

          5,

        );

      }



      return navigation

        .filter(

          (item) => {

            const searchText =

              [

                item.title,

                item.description,

                ...item.keywords,

              ]

                .join(" ")

                .toLowerCase();



            return searchText.includes(

              query,

            );

          },

        )

        .slice(0, 6);

    }, [

      searchQuery,

    ]);



  function closeAll() {

    setSearchOpen(

      false,

    );



    setNotificationsOpen(

      false,

    );



    setAccountOpen(

      false,

    );



    setLogoutOpen(

      false,

    );

  }



  function navigateTo(

    href: string,

  ) {

    closeAll();



    setSearchQuery(

      "",

    );



    router.push(

      href,

    );

  }



  useEffect(() => {

    const frame =

      window.requestAnimationFrame(

        () => {

          setSearchOpen(

            false,

          );



          setNotificationsOpen(

            false,

          );



          setAccountOpen(

            false,

          );



          setLogoutOpen(

            false,

          );



          setSearchQuery(

            "",

          );

        },

      );



    return () =>

      window.cancelAnimationFrame(

        frame,

      );

  }, [

    pathname,

  ]);



  useEffect(() => {

    function handleKeyDown(

      event: KeyboardEvent,

    ) {

      if (

        event.key ===

        "Escape"

      ) {

        closeAll();



        return;

      }



      if (

        event.key !==

        "/"

      ) {

        return;

      }



      const target =

        event.target as

          | HTMLElement

          | null;



      const tag =

        target?.tagName

          ?.toLowerCase();



      if (

        tag === "input" ||

        tag ===

          "textarea" ||

        target?.isContentEditable

      ) {

        return;

      }



      event.preventDefault();



      setNotificationsOpen(

        false,

      );



      setAccountOpen(

        false,

      );



      setSearchOpen(

        true,

      );



      requestAnimationFrame(

        () => {

          inputRef.current

            ?.focus();

        },

      );

    }



    document.addEventListener(

      "keydown",

      handleKeyDown,

    );



    return () => {

      document.removeEventListener(

        "keydown",

        handleKeyDown,

      );

    };

  }, []);



  useEffect(() => {

    function handlePointerDown(

      event: MouseEvent,

    ) {

      const target =

        event.target as Node;



      if (

        searchRef.current &&

        !searchRef.current.contains(

          target,

        )

      ) {

        setSearchOpen(

          false,

        );

      }



      if (

        notificationRef.current &&

        !notificationRef.current.contains(

          target,

        )

      ) {

        setNotificationsOpen(

          false,

        );

      }



      if (

        accountRef.current &&

        !accountRef.current.contains(

          target,

        )

      ) {

        setAccountOpen(

          false,

        );

      }

    }



    document.addEventListener(

      "mousedown",

      handlePointerDown,

    );



    return () => {

      document.removeEventListener(

        "mousedown",

        handlePointerDown,

      );

    };

  }, []);



  return (

    <>

      <header

      className="

        sticky

        top-0

        z-30

        h-[68px]

        border-b

        border-slate-200

        bg-white/95

        backdrop-blur-md

      "

    >

      <div

        className="

          flex

          h-full

          items-center

          gap-4

          px-4

          sm:px-6

          xl:px-8

        "

      >

        {/* Mobile menu */}

        <button

          type="button"

          onClick={

            onMenuClick

          }

          aria-label="Open navigation"

          className="

            flex

            h-9

            w-9

            shrink-0

            items-center

            justify-center

            border

            border-slate-200

            bg-white

            text-slate-600

            transition-colors

            hover:bg-slate-50

            hover:text-slate-950

            focus:outline-none

            focus:ring-2

            focus:ring-[#FDC1C9]

            lg:hidden

          "

        >

          <Menu

            size={18}

          />

        </button>



        {/* Page heading */}

        <div

          className="

            min-w-0

            flex-1

          "

        >

          <h1

            className="

              truncate

              text-[16px]

              font-semibold

              tracking-[-0.015em]

              text-slate-950

            "

          >

            {page.title}

          </h1>



          <p

            className="

              mt-0.5

              hidden

              truncate

              text-[11px]

              text-slate-500

              sm:block

            "

          >

            {

              page.description

            }

          </p>

        </div>



        <div

          className="

            flex

            items-center

            gap-2

          "

        >

          {/* Search */}

          <div

            ref={searchRef}

            className="

              relative

            "

          >

            <div

              className="

                hidden

                md:block

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

                ref={inputRef}

                type="search"

                value={

                  searchQuery

                }

                onChange={(

                  event,

                ) => {

                  setSearchQuery(

                    event

                      .target

                      .value,

                  );



                  setSearchOpen(

                    true,

                  );

                }}

                onFocus={() => {

                  setSearchOpen(

                    true,

                  );



                  setNotificationsOpen(

                    false,

                  );



                  setAccountOpen(

                    false,

                  );

                }}

                onKeyDown={(

                  event,

                ) => {

                  if (

                    event.key ===

                      "Enter" &&

                    results[0]

                  ) {

                    event.preventDefault();



                    navigateTo(

                      results[0]

                        .href,

                    );

                  }

                }}

                placeholder="Search admin..."

                className="

                  h-9

                  w-[220px]

                  border

                  border-slate-200

                  bg-slate-50/60

                  pl-9

                  pr-10

                  text-xs

                  text-slate-800

                  outline-none

                  transition

                  placeholder:text-slate-400

                  hover:border-slate-300

                  focus:border-[#CC3A67]

                  focus:bg-white

                  focus:ring-2

                  focus:ring-[#FDC1C9]/40

                  lg:w-[280px]

                "

              />



              <kbd

                className="

                  pointer-events-none

                  absolute

                  right-2.5

                  top-1/2

                  -translate-y-1/2

                  border

                  border-slate-200

                  bg-white

                  px-1.5

                  py-0.5

                  text-[9px]

                  font-medium

                  text-slate-400

                "

              >

                /

              </kbd>

            </div>



            {/* Mobile search */}

            <button

              type="button"

              aria-label="Search"

              onClick={() => {

                setSearchOpen(

                  !searchOpen,

                );



                setNotificationsOpen(

                  false,

                );



                setAccountOpen(

                  false,

                );



                requestAnimationFrame(

                  () =>

                    inputRef.current

                      ?.focus(),

                );

              }}

              className="

                flex

                h-9

                w-9

                items-center

                justify-center

                border

                border-slate-200

                text-slate-500

                transition

                hover:bg-slate-50

                hover:text-slate-900

                md:hidden

              "

            >

              <Search

                size={17}

              />

            </button>



            {searchOpen && (

              <div

                className="

                  fixed

                  left-4

                  right-4

                  top-[76px]

                  z-50

                  border

                  border-slate-200

                  bg-white

                  shadow-xl

                  shadow-slate-900/10

                  md:absolute

                  md:left-auto

                  md:right-0

                  md:top-[44px]

                  md:w-[380px]

                "

              >

                <div

                  className="

                    flex

                    items-center

                    border-b

                    border-slate-100

                    px-3

                    md:hidden

                  "

                >

                  <Search

                    size={16}

                    className="

                      shrink-0

                      text-slate-400

                    "

                  />



                  <input

                    type="search"

                    value={

                      searchQuery

                    }

                    onChange={(

                      event,

                    ) =>

                      setSearchQuery(

                        event

                          .target

                          .value,

                      )

                    }

                    onKeyDown={(

                      event,

                    ) => {

                      if (

                        event.key ===

                          "Enter" &&

                        results[0]

                      ) {

                        navigateTo(

                          results[0]

                            .href,

                        );

                      }

                    }}

                    autoFocus

                    placeholder="Search admin..."

                    className="

                      h-12

                      min-w-0

                      flex-1

                      bg-transparent

                      px-3

                      text-sm

                      outline-none

                    "

                  />



                  <button

                    type="button"

                    onClick={() =>

                      setSearchOpen(

                        false,

                      )

                    }

                    aria-label="Close search"

                    className="

                      text-slate-400

                      hover:text-slate-700

                    "

                  >

                    <X

                      size={17}

                    />

                  </button>

                </div>



                <div

                  className="

                    max-h-[340px]

                    overflow-y-auto

                    p-2

                  "

                >

                  {results.length >

                  0 ? (

                    results.map(

                      (

                        result,

                      ) => (

                        <button

                          key={

                            result.href

                          }

                          type="button"

                          onClick={() =>

                            navigateTo(

                              result.href,

                            )

                          }

                          className="

                            flex

                            w-full

                            items-start

                            gap-3

                            px-3

                            py-2.5

                            text-left

                            transition

                            hover:bg-slate-50

                          "

                        >

                          <Search

                            size={14}

                            className="

                              mt-0.5

                              shrink-0

                              text-slate-400

                            "

                          />



                          <span

                            className="

                              min-w-0

                            "

                          >

                            <span

                              className="

                                block

                                text-xs

                                font-semibold

                                text-slate-800

                              "

                            >

                              {

                                result.title

                              }

                            </span>



                            <span

                              className="

                                mt-0.5

                                block

                                truncate

                                text-[10px]

                                text-slate-400

                              "

                            >

                              {

                                result.description

                              }

                            </span>

                          </span>

                        </button>

                      ),

                    )

                  ) : (

                    <div

                      className="

                        px-4

                        py-8

                        text-center

                      "

                    >

                      <p

                        className="

                          text-xs

                          font-medium

                          text-slate-600

                        "

                      >

                        No results

                        found

                      </p>



                      <p

                        className="

                          mt-1

                          text-[10px]

                          text-slate-400

                        "

                      >

                        Try a

                        different

                        page or

                        keyword.

                      </p>

                    </div>

                  )}

                </div>



                <div

                  className="

                    border-t

                    border-slate-100

                    bg-slate-50/60

                    px-3

                    py-2

                    text-[10px]

                    text-slate-400

                  "

                >

                  Press Enter to

                  open the first

                  result.

                </div>

              </div>

            )}

          </div>



          {/* Notifications */}

          <div

            ref={

              notificationRef

            }

            className="

              relative

            "

          >

            <button

              type="button"

              aria-label="Moderation notifications"

              aria-expanded={

                notificationsOpen

              }

              onClick={() => {

                setNotificationsOpen(

                  !notificationsOpen,

                );



                setSearchOpen(

                  false,

                );



                setAccountOpen(

                  false,

                );

              }}

              className="

                relative

                flex

                h-9

                w-9

                items-center

                justify-center

                border

                border-slate-200

                bg-white

                text-slate-500

                transition

                hover:bg-slate-50

                hover:text-slate-900

                focus:outline-none

                focus:ring-2

                focus:ring-[#FDC1C9]

              "

            >

              <Bell

                size={17}

              />



              {topbarData.attentionCount >

                0 && (

                <span

                  className="

                    absolute

                    -right-1.5

                    -top-1.5

                    flex

                    h-[18px]

                    min-w-[18px]

                    items-center

                    justify-center

                    rounded-full

                    bg-[#A92F56]

                    px-1

                    text-[9px]

                    font-bold

                    text-white

                    ring-2

                    ring-white

                  "

                >

                  {topbarData.attentionCount >

                  99

                    ? "99+"

                    : topbarData.attentionCount}

                </span>

              )}

            </button>



            {notificationsOpen && (

              <div

                className="

                  fixed

                  left-4

                  right-4

                  top-[76px]

                  z-50

                  overflow-hidden

                  border

                  border-slate-200

                  bg-white

                  shadow-xl

                  shadow-slate-900/10

                  sm:absolute

                  sm:left-auto

                  sm:right-0

                  sm:top-[44px]

                  sm:w-[360px]

                "

              >

                <div

                  className="

                    flex

                    items-center

                    justify-between

                    border-b

                    border-slate-100

                    px-4

                    py-3

                  "

                >

                  <div>

                    <p

                      className="

                        text-xs

                        font-semibold

                        text-slate-900

                      "

                    >

                      Requires

                      attention

                    </p>



                    <p

                      className="

                        mt-0.5

                        text-[10px]

                        text-slate-400

                      "

                    >

                      Moderation

                      queue

                    </p>

                  </div>



                  {topbarData.attentionCount >

                    0 && (

                    <span

                      className="

                        rounded-full

                        bg-[#A92F56]/10

                        px-2

                        py-1

                        text-[10px]

                        font-semibold

                        text-[#A92F56]

                      "

                    >

                      {

                        topbarData.attentionCount

                      }

                    </span>

                  )}

                </div>



                {topbarData.recentReports

                  .length >

                0 ? (

                  <div

                    className="

                      divide-y

                      divide-slate-100

                    "

                  >

                    {topbarData.recentReports.map(

                      (

                        report,

                      ) => (

                        <Link

                          key={

                            report.id

                          }

                          href="/admin/reports"

                          onClick={() =>

                            setNotificationsOpen(

                              false,

                            )

                          }

                          className="

                            flex

                            items-start

                            gap-3

                            px-4

                            py-3.5

                            transition

                            hover:bg-slate-50

                          "

                        >

                          <div

                            className="

                              mt-0.5

                              flex

                              h-8

                              w-8

                              shrink-0

                              items-center

                              justify-center

                              bg-amber-50

                              text-amber-600

                            "

                          >

                            <AlertTriangle

                              size={14}

                            />

                          </div>



                          <div

                            className="

                              min-w-0

                              flex-1

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

                              <p

                                className="

                                  truncate

                                  text-xs

                                  font-semibold

                                  text-slate-800

                                "

                              >

                                {formatLabel(

                                  report.type,

                                )}

                              </p>



                              <span

                                className="

                                  shrink-0

                                  text-[9px]

                                  text-slate-400

                                "

                              >

                                {formatRelativeTime(

                                  report.created_at,

                                )}

                              </span>

                            </div>



                            <p

                              className="

                                mt-1

                                line-clamp-2

                                text-[11px]

                                leading-4

                                text-slate-500

                              "

                            >

                              {

                                report.reason

                              }

                            </p>



                            <p

                              className="

                                mt-1.5

                                text-[9px]

                                font-semibold

                                uppercase

                                tracking-wide

                                text-[#A92F56]

                              "

                            >

                              {formatLabel(

                                report.status,

                              )}

                            </p>

                          </div>

                        </Link>

                      ),

                    )}

                  </div>

                ) : (

                  <div

                    className="

                      px-6

                      py-10

                      text-center

                    "

                  >

                    <Bell

                      size={20}

                      className="

                        mx-auto

                        text-slate-300

                      "

                    />



                    <p

                      className="

                        mt-3

                        text-xs

                        font-medium

                        text-slate-600

                      "

                    >

                      You&apos;re all

                      caught up

                    </p>



                    <p

                      className="

                        mt-1

                        text-[10px]

                        text-slate-400

                      "

                    >

                      No pending

                      moderation

                      items.

                    </p>

                  </div>

                )}



                <Link

                  href="/admin/reports"

                  onClick={() =>

                    setNotificationsOpen(

                      false,

                    )

                  }

                  className="

                    flex

                    h-10

                    items-center

                    justify-center

                    border-t

                    border-slate-100

                    bg-slate-50/60

                    text-[11px]

                    font-semibold

                    text-[#A92F56]

                    transition

                    hover:bg-slate-50

                    hover:text-[#72213A]

                  "

                >

                  Open moderation

                  queue

                </Link>

              </div>

            )}

          </div>



          {/* Divider */}

          <div

            className="

              hidden

              h-6

              w-px

              bg-slate-200

              sm:block

            "

          />



          {/* Account */}

          <div

            ref={accountRef}

            className="

              relative

            "

          >

            <button

              type="button"

              aria-expanded={

                accountOpen

              }

              onClick={() => {

                setAccountOpen(

                  !accountOpen,

                );



                setSearchOpen(

                  false,

                );



                setNotificationsOpen(

                  false,

                );

              }}

              className="

                flex

                h-10

                items-center

                gap-2

                px-1

                transition

                hover:bg-slate-50

                focus:outline-none

                focus:ring-2

                focus:ring-[#FDC1C9]

              "

            >

              <div

                className="

                  flex

                  h-8

                  w-8

                  shrink-0

                  items-center

                  justify-center

                  bg-[#72213A]

                  text-[10px]

                  font-semibold

                  text-white

                "

              >

                {initials}

              </div>



              <div

                className="

                  hidden

                  max-w-[140px]

                  text-left

                  xl:block

                "

              >

                <p

                  className="

                    truncate

                    text-[11px]

                    font-semibold

                    text-slate-800

                  "

                >

                  {

                    displayName

                  }

                </p>



                <p

                  className="

                    mt-0.5

                    truncate

                    text-[9px]

                    font-medium

                    uppercase

                    tracking-wide

                    text-slate-400

                  "

                >

                  {admin.role}

                </p>

              </div>



              <ChevronDown

                size={13}

                className={`

                  hidden

                  text-slate-400

                  transition-transform

                  xl:block

                  ${

                    accountOpen

                      ? "rotate-180"

                      : ""

                  }

                `}

              />

            </button>



            {accountOpen && (

              <div

                className="

                  absolute

                  right-0

                  top-[46px]

                  z-50

                  w-[260px]

                  overflow-hidden

                  border

                  border-slate-200

                  bg-white

                  shadow-xl

                  shadow-slate-900/10

                "

              >

                <div

                  className="

                    border-b

                    border-slate-100

                    px-4

                    py-4

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

                        h-10

                        w-10

                        shrink-0

                        items-center

                        justify-center

                        bg-[#72213A]

                        text-xs

                        font-semibold

                        text-white

                      "

                    >

                      {

                        initials

                      }

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

                        {

                          displayName

                        }

                      </p>



                      <p

                        className="

                          mt-0.5

                          truncate

                          text-[10px]

                          text-slate-400

                        "

                      >

                        {

                          admin.email

                        }

                      </p>

                    </div>

                  </div>

                </div>



                <div

                  className="

                    p-2

                  "

                >

                  <Link

                    href="/admin/activity-logs"

                    onClick={() =>

                      setAccountOpen(

                        false,

                      )

                    }

                    className="

                      flex

                      items-center

                      gap-3

                      px-3

                      py-2.5

                      text-xs

                      font-medium

                      text-slate-600

                      transition

                      hover:bg-slate-50

                      hover:text-slate-900

                    "

                  >

                    <FileText

                      size={15}

                    />



                    Activity logs

                  </Link>



                  <Link

                    href="/admin/settings"

                    onClick={() =>

                      setAccountOpen(

                        false,

                      )

                    }

                    className="

                      flex

                      items-center

                      gap-3

                      px-3

                      py-2.5

                      text-xs

                      font-medium

                      text-slate-600

                      transition

                      hover:bg-slate-50

                      hover:text-slate-900

                    "

                  >

                    <Settings

                      size={15}

                    />



                    Settings

                  </Link>

                </div>



                <div

                  className="

                    border-t

                    border-slate-100

                    p-2

                  "

                >

                  <button

                    type="button"

                    onClick={() => {

                      setAccountOpen(

                        false,

                      );



                      setLogoutOpen(

                        true,

                      );

                    }}

                    className="

                      flex

                      w-full

                      items-center

                      gap-3

                      px-3

                      py-2.5

                      text-left

                      text-xs

                      font-medium

                      text-red-600

                      transition

                      hover:bg-red-50

                    "

                  >

                    <LogOut

                      size={15}

                    />



                    Log out

                  </button>

                </div>

              </div>

            )}

          </div>

        </div>

      </div>

      </header>



      <LogoutConfirmModal

        open={

          logoutOpen

        }

        pending={

          logoutPending

        }

        onClose={() => {

          if (

            logoutPending

          ) {

            return;

          }



          setLogoutOpen(

            false,

          );

        }}

        onConfirm={() => {

          if (

            logoutPending

          ) {

            return;

          }



          startLogoutTransition(

            async () => {

              await logoutAction();

            },

          );

        }}

      />

    </>

  );

}