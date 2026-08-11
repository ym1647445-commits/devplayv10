"use client";

import {
  BellRing,
  Cake,
  CheckCircle2,
  ChevronLeft,
  Clock3,
  Eye,
  Gift,
  LoaderCircle,
  Mail,
  MessageSquareText,
  Search,
  Send,
  ShieldCheck,
  Sparkles,
  Target,
  TicketPercent,
  UserRound,
  UsersRound,
} from "lucide-react";
import {
  useMemo,
  useState,
  useTransition,
} from "react";
import { useRouter } from "next/navigation";

import {
  sendAdminNotification,
} from "@/app/admin/notifications/actions";
import type {
  NotificationAudienceType,
} from "@/types/adminNotification";

import styles from "./NotificationsManager.module.css";

interface RawCampaign {
  id: string;

  title: string;
  message: string;

  notification_type: string;
  action_url: string | null;

  audience_type:
    NotificationAudienceType;

  audience_value: string | null;

  recipients_count: number;

  sent_by: string | null;

  created_at: string;
}

interface RawUser {
  id: string;

  customer_id: string;
  full_name: string | null;

  email: string | null;
  phone: string | null;

  status: string;
  customer_level: string;

  points: number;

  birth_date: string | null;
}

interface NotificationsManagerProps {
  campaigns: RawCampaign[];
  users: RawUser[];
}

interface NotificationTemplate {
  id: string;
  title: string;
  message: string;
  actionUrl: string;
  notificationType: string;
}

const notificationTemplates:
  NotificationTemplate[] = [
    {
      id: "offer",
      title: "عرض جديد من DevPlay 🎁",
      message:
        "عندنا عرض جديد متاح لفترة محدودة. افتحي المتجر وشوفي التفاصيل قبل انتهاء العرض.",
      actionUrl: "/offers",
      notificationType:
        "promotion",
    },
    {
      id: "coupon",
      title: "كوبون خصم جديد 🎟️",
      message:
        "تم توفير كوبون خصم جديد على حسابك. راجعي صفحة الكوبونات لمعرفة الشروط ومدة الصلاحية.",
      actionUrl: "/coupons",
      notificationType:
        "coupon_available",
    },
    {
      id: "points",
      title: "استخدمي نقاطك الآن ⭐",
      message:
        "عندك نقاط متاحة يمكن استبدالها بكوبونات خصم من صفحة المكافآت.",
      actionUrl: "/rewards",
      notificationType:
        "reward_reminder",
    },
    {
      id: "birthday",
      title: "كل سنة وإنتِ طيبة 🎂",
      message:
        "فريق DevPlay بيتمنالك سنة سعيدة. عندنا هدية خاصة بمناسبة عيد ميلادك.",
      actionUrl: "/rewards",
      notificationType:
        "birthday_gift",
    },
    {
      id: "maintenance",
      title: "تنبيه بخصوص الخدمة",
      message:
        "قد تتأثر بعض الخدمات مؤقتًا بسبب أعمال التحديث. سنعيد الخدمة للعمل في أسرع وقت.",
      actionUrl: null as unknown as string,
      notificationType:
        "service_notice",
    },
  ];

const audienceOptions: {
  value: NotificationAudienceType;
  label: string;
  description: string;
  icon: typeof UsersRound;
}[] = [
  {
    value: "all",
    label: "كل العملاء",
    description:
      "إرسال لجميع الحسابات النشطة.",
    icon: UsersRound,
  },
  {
    value: "single_user",
    label: "عميل محدد",
    description:
      "اختيار عميل واحد فقط.",
    icon: UserRound,
  },
  {
    value: "status",
    label: "حسب حالة الحساب",
    description:
      "نشط أو موقوف أو محظور.",
    icon: ShieldCheck,
  },
  {
    value: "level",
    label: "حسب المستوى",
    description:
      "إرسال لمستوى ولاء محدد.",
    icon: Sparkles,
  },
  {
    value: "minimum_points",
    label: "حسب عدد النقاط",
    description:
      "العملاء الذين لديهم حد أدنى من النقاط.",
    icon: Target,
  },
  {
    value: "birthday_today",
    label: "أعياد الميلاد اليوم",
    description:
      "العملاء أصحاب عيد الميلاد اليوم.",
    icon: Cake,
  },
];

function formatDateTime(
  value: string,
): string {
  return new Intl.DateTimeFormat(
    "ar-EG",
    {
      dateStyle: "medium",
      timeStyle: "short",
    },
  ).format(new Date(value));
}

function isBirthdayToday(
  birthDate: string | null,
): boolean {
  if (!birthDate) {
    return false;
  }

  const birth =
    new Date(`${birthDate}T00:00:00`);

  const today = new Date();

  return (
    birth.getMonth() ===
      today.getMonth() &&
    birth.getDate() ===
      today.getDate()
  );
}

function getAudienceLabel(
  campaign: RawCampaign,
  users: RawUser[],
): string {
  switch (campaign.audience_type) {
    case "all":
      return "كل العملاء";

    case "single_user": {
      const user = users.find(
        (item) =>
          item.id ===
          campaign.audience_value,
      );

      return (
        user?.full_name ||
        user?.customer_id ||
        "عميل محدد"
      );
    }

    case "status":
      return `حالة: ${
        campaign.audience_value ??
        "غير محددة"
      }`;

    case "level":
      return `مستوى: ${
        campaign.audience_value ??
        "غير محدد"
      }`;

    case "minimum_points":
      return `${
        campaign.audience_value ??
        "0"
      } نقطة أو أكثر`;

    case "birthday_today":
      return "أعياد الميلاد اليوم";

    default:
      return "جمهور مخصص";
  }
}

export function NotificationsManager({
  campaigns,
  users,
}: NotificationsManagerProps) {
  const router = useRouter();

  const [
    pending,
    startTransition,
  ] = useTransition();

  const [title, setTitle] =
    useState("");

  const [message, setMessage] =
    useState("");

  const [
    notificationType,
    setNotificationType,
  ] = useState(
    "admin_broadcast",
  );

  const [actionUrl, setActionUrl] =
    useState("");

  const [
    audienceType,
    setAudienceType,
  ] =
    useState<NotificationAudienceType>(
      "all",
    );

  const [
    audienceValue,
    setAudienceValue,
  ] = useState("");

  const [
    userSearch,
    setUserSearch,
  ] = useState("");

  const [
    campaignSearch,
    setCampaignSearch,
  ] = useState("");

  const [
    resultMessage,
    setResultMessage,
  ] = useState<string | null>(
    null,
  );

  const [
    resultSuccess,
    setResultSuccess,
  ] = useState(false);

  const [
    selectedCampaign,
    setSelectedCampaign,
  ] =
    useState<RawCampaign | null>(
      null,
    );

  const filteredUsers =
    useMemo(() => {
      const normalized =
        userSearch
          .trim()
          .toLowerCase();

      if (!normalized) {
        return users;
      }

      return users.filter((user) =>
        [
          user.customer_id,
          user.full_name,
          user.email,
          user.phone,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase()
          .includes(normalized),
      );
    }, [users, userSearch]);

  const filteredCampaigns =
    useMemo(() => {
      const normalized =
        campaignSearch
          .trim()
          .toLowerCase();

      if (!normalized) {
        return campaigns;
      }

      return campaigns.filter(
        (campaign) =>
          [
            campaign.title,
            campaign.message,
            campaign.notification_type,
            getAudienceLabel(
              campaign,
              users,
            ),
          ]
            .join(" ")
            .toLowerCase()
            .includes(normalized),
      );
    }, [
      campaigns,
      campaignSearch,
      users,
    ]);

  const recipientsPreview =
    useMemo(() => {
      if (
        audienceType === "all"
      ) {
        return users.filter(
          (user) =>
            user.status === "active",
        ).length;
      }

      if (
        audienceType ===
        "single_user"
      ) {
        return users.some(
          (user) =>
            user.id ===
            audienceValue,
        )
          ? 1
          : 0;
      }

      if (
        audienceType === "status"
      ) {
        return users.filter(
          (user) =>
            user.status ===
            audienceValue,
        ).length;
      }

      if (
        audienceType === "level"
      ) {
        return users.filter(
          (user) =>
            user.customer_level.toLowerCase() ===
            audienceValue.toLowerCase(),
        ).length;
      }

      if (
        audienceType ===
        "minimum_points"
      ) {
        const minimumPoints =
          Number(audienceValue);

        if (
          !Number.isFinite(
            minimumPoints,
          )
        ) {
          return 0;
        }

        return users.filter(
          (user) =>
            user.status ===
              "active" &&
            Number(user.points) >=
              minimumPoints,
        ).length;
      }

      if (
        audienceType ===
        "birthday_today"
      ) {
        return users.filter(
          (user) =>
            user.status ===
              "active" &&
            isBirthdayToday(
              user.birth_date,
            ),
        ).length;
      }

      return 0;
    }, [
      users,
      audienceType,
      audienceValue,
    ]);

  const totalRecipients =
    campaigns.reduce(
      (total, campaign) =>
        total +
        Number(
          campaign.recipients_count,
        ),
      0,
    );

  const birthdayUsers =
    users.filter((user) =>
      isBirthdayToday(
        user.birth_date,
      ),
    ).length;

  function selectAudience(
    value: NotificationAudienceType,
  ): void {
    setAudienceType(value);
    setAudienceValue("");
    setUserSearch("");
    setResultMessage(null);
  }

  function applyTemplate(
    template: NotificationTemplate,
  ): void {
    setTitle(template.title);
    setMessage(template.message);

    setNotificationType(
      template.notificationType,
    );

    setActionUrl(
      template.actionUrl ?? "",
    );

    if (
      template.id === "birthday"
    ) {
      setAudienceType(
        "birthday_today",
      );

      setAudienceValue("");
    }

    setResultMessage(null);
  }

  function resetForm(): void {
    setTitle("");
    setMessage("");

    setNotificationType(
      "admin_broadcast",
    );

    setActionUrl("");

    setAudienceType("all");
    setAudienceValue("");

    setUserSearch("");

    setResultMessage(null);
  }

  function handleSend(): void {
    if (pending) {
      return;
    }

    setResultMessage(null);

    startTransition(async () => {
      const result =
        await sendAdminNotification({
          title,
          message,

          notificationType,

          actionUrl:
            actionUrl.trim() ||
            null,

          audienceType,

          audienceValue:
            audienceType ===
              "all" ||
            audienceType ===
              "birthday_today"
              ? null
              : audienceValue ||
                null,
        });

      setResultMessage(
        result.message,
      );

      setResultSuccess(
        result.success,
      );

      if (result.success) {
        resetForm();

        setResultMessage(
          result.message,
        );

        setResultSuccess(true);

        router.refresh();
      }
    });
  }

  return (
    <section className={styles.page}>
      <header className={styles.heading}>
        <div>
          <span>
            NOTIFICATION CENTER
          </span>

          <h1>
            مركز الإشعارات
          </h1>

          <p>
            إرسال رسائل للعملاء حسب الحساب
            أو المستوى أو النقاط أو عيد
            الميلاد.
          </p>
        </div>

        <span className={styles.liveBadge}>
          <BellRing size={17} />

          الإشعارات تعمل
        </span>
      </header>

      <section className={styles.stats}>
        <article>
          <span>
            <UsersRound size={19} />
          </span>

          <div>
            <small>
              إجمالي العملاء
            </small>

            <strong>
              {users.length.toLocaleString(
                "ar-EG",
              )}
            </strong>
          </div>
        </article>

        <article>
          <span>
            <Send size={19} />
          </span>

          <div>
            <small>
              الحملات السابقة
            </small>

            <strong>
              {campaigns.length.toLocaleString(
                "ar-EG",
              )}
            </strong>
          </div>
        </article>

        <article>
          <span>
            <MessageSquareText
              size={19}
            />
          </span>

          <div>
            <small>
              إجمالي المستلمين
            </small>

            <strong>
              {totalRecipients.toLocaleString(
                "ar-EG",
              )}
            </strong>
          </div>
        </article>

        <article>
          <span>
            <Cake size={19} />
          </span>

          <div>
            <small>
              أعياد الميلاد اليوم
            </small>

            <strong>
              {birthdayUsers.toLocaleString(
                "ar-EG",
              )}
            </strong>
          </div>
        </article>
      </section>

      <section className={styles.layout}>
        <div className={styles.mainColumn}>
          <section className={styles.panel}>
            <header>
              <MessageSquareText
                size={18}
              />

              <div>
                <strong>
                  محتوى الإشعار
                </strong>

                <small>
                  اكتبي الرسالة التي ستظهر
                  داخل حساب العميل.
                </small>
              </div>
            </header>

            <label>
              <span>
                عنوان الإشعار
              </span>

              <input
                value={title}
                maxLength={100}
                onChange={(event) =>
                  setTitle(
                    event.target.value,
                  )
                }
                placeholder="مثال: عرض جديد من DevPlay"
              />

              <small>
                {title.length}/100
              </small>
            </label>

            <label>
              <span>
                نص الإشعار
              </span>

              <textarea
                value={message}
                maxLength={500}
                onChange={(event) =>
                  setMessage(
                    event.target.value,
                  )
                }
                placeholder="اكتبي تفاصيل الرسالة هنا"
              />

              <small>
                {message.length}/500
              </small>
            </label>

            <div className={styles.twoColumns}>
              <label>
                <span>
                  نوع الإشعار
                </span>

                <select
                  value={
                    notificationType
                  }
                  onChange={(event) =>
                    setNotificationType(
                      event.target.value,
                    )
                  }
                >
                  <option value="admin_broadcast">
                    إعلان إداري
                  </option>

                  <option value="promotion">
                    عرض ترويجي
                  </option>

                  <option value="coupon_available">
                    كوبون
                  </option>

                  <option value="reward_reminder">
                    نقاط ومكافآت
                  </option>

                  <option value="birthday_gift">
                    هدية عيد ميلاد
                  </option>

                  <option value="service_notice">
                    تنبيه خدمة
                  </option>

                  <option value="security_notice">
                    تنبيه أمني
                  </option>
                </select>
              </label>

              <label>
                <span>
                  رابط عند الضغط
                </span>

                <input
                  value={actionUrl}
                  onChange={(event) =>
                    setActionUrl(
                      event.target.value,
                    )
                  }
                  placeholder="/offers"
                />
              </label>
            </div>
          </section>

          <section className={styles.panel}>
            <header>
              <Target size={18} />

              <div>
                <strong>
                  تحديد الجمهور
                </strong>

                <small>
                  اختاري من سيستقبل الإشعار.
                </small>
              </div>
            </header>

            <div className={styles.audienceGrid}>
              {audienceOptions.map(
                (option) => {
                  const Icon =
                    option.icon;

                  return (
                    <button
                      type="button"
                      key={option.value}
                      className={
                        audienceType ===
                        option.value
                          ? styles.activeAudience
                          : ""
                      }
                      onClick={() =>
                        selectAudience(
                          option.value,
                        )
                      }
                    >
                      <Icon size={19} />

                      <strong>
                        {option.label}
                      </strong>

                      <small>
                        {option.description}
                      </small>
                    </button>
                  );
                },
              )}
            </div>

            {audienceType ===
              "single_user" && (
              <section
                className={
                  styles.userSelector
                }
              >
                <label
                  className={
                    styles.search
                  }
                >
                  <Search size={16} />

                  <input
                    type="search"
                    value={userSearch}
                    onChange={(event) =>
                      setUserSearch(
                        event.target.value,
                      )
                    }
                    placeholder="بحث بالاسم أو رقم العميل"
                  />
                </label>

                <div
                  className={
                    styles.usersList
                  }
                >
                  {filteredUsers
                    .slice(0, 20)
                    .map((user) => (
                      <button
                        type="button"
                        key={user.id}
                        className={
                          audienceValue ===
                          user.id
                            ? styles.selectedUser
                            : ""
                        }
                        onClick={() =>
                          setAudienceValue(
                            user.id,
                          )
                        }
                      >
                        <span>
                          <UserRound
                            size={17}
                          />
                        </span>

                        <div>
                          <strong>
                            {user.full_name ||
                              "عميل DevPlay"}
                          </strong>

                          <small>
                            {
                              user.customer_id
                            }
                            {" · "}
                            {Number(
                              user.points,
                            ).toLocaleString(
                              "ar-EG",
                            )}{" "}
                            نقطة
                          </small>
                        </div>

                        {audienceValue ===
                          user.id && (
                          <CheckCircle2
                            size={17}
                          />
                        )}
                      </button>
                    ))}
                </div>
              </section>
            )}

            {audienceType ===
              "status" && (
              <label>
                <span>
                  حالة الحساب
                </span>

                <select
                  value={audienceValue}
                  onChange={(event) =>
                    setAudienceValue(
                      event.target.value,
                    )
                  }
                >
                  <option value="">
                    اختاري الحالة
                  </option>

                  <option value="active">
                    نشط
                  </option>

                  <option value="suspended">
                    موقوف مؤقتًا
                  </option>

                  <option value="banned">
                    محظور
                  </option>

                  <option value="pending_verification">
                    بانتظار التحقق
                  </option>
                </select>
              </label>
            )}

            {audienceType ===
              "level" && (
              <label>
                <span>
                  مستوى العميل
                </span>

                <select
                  value={audienceValue}
                  onChange={(event) =>
                    setAudienceValue(
                      event.target.value,
                    )
                  }
                >
                  <option value="">
                    اختاري المستوى
                  </option>

                  <option value="bronze">
                    برونزي
                  </option>

                  <option value="silver">
                    فضي
                  </option>

                  <option value="gold">
                    ذهبي
                  </option>

                  <option value="diamond">
                    ماسي
                  </option>

                  <option value="elite">
                    نخبة
                  </option>

                  <option value="vip">
                    VIP
                  </option>
                </select>
              </label>
            )}

            {audienceType ===
              "minimum_points" && (
              <label>
                <span>
                  الحد الأدنى للنقاط
                </span>

                <input
                  type="number"
                  min="0"
                  step="1"
                  value={audienceValue}
                  onChange={(event) =>
                    setAudienceValue(
                      event.target.value,
                    )
                  }
                  placeholder="مثال: 500"
                />
              </label>
            )}

            <div
              className={
                styles.recipientsPreview
              }
            >
              <UsersRound size={18} />

              <span>
                <small>
                  العدد المتوقع للمستلمين
                </small>

                <strong>
                  {recipientsPreview.toLocaleString(
                    "ar-EG",
                  )}{" "}
                  مستخدم
                </strong>
              </span>
            </div>
          </section>

          <section className={styles.panel}>
            <header>
              <Sparkles size={18} />

              <div>
                <strong>
                  قوالب سريعة
                </strong>

                <small>
                  اختاري قالبًا وعدليه قبل
                  الإرسال.
                </small>
              </div>
            </header>

            <div className={styles.templatesGrid}>
              {notificationTemplates.map(
                (template) => (
                  <button
                    type="button"
                    key={template.id}
                    onClick={() =>
                      applyTemplate(
                        template,
                      )
                    }
                  >
                    {template.id ===
                      "coupon" && (
                      <TicketPercent
                        size={18}
                      />
                    )}

                    {template.id ===
                      "birthday" && (
                      <Cake size={18} />
                    )}

                    {template.id ===
                      "points" && (
                      <Gift size={18} />
                    )}

                    {template.id ===
                      "offer" && (
                      <Sparkles
                        size={18}
                      />
                    )}

                    {template.id ===
                      "maintenance" && (
                      <BellRing
                        size={18}
                      />
                    )}

                    <strong>
                      {template.title}
                    </strong>

                    <small>
                      {template.message}
                    </small>
                  </button>
                ),
              )}
            </div>
          </section>

          <section className={styles.historyPanel}>
            <header>
              <div>
                <Clock3 size={18} />

                <span>
                  <strong>
                    سجل الحملات
                  </strong>

                  <small>
                    آخر الإشعارات المرسلة.
                  </small>
                </span>
              </div>

              <label
                className={
                  styles.historySearch
                }
              >
                <Search size={15} />

                <input
                  type="search"
                  value={campaignSearch}
                  onChange={(event) =>
                    setCampaignSearch(
                      event.target.value,
                    )
                  }
                  placeholder="بحث"
                />
              </label>
            </header>

            {filteredCampaigns.length ===
            0 ? (
              <div className={styles.emptyHistory}>
                <BellRing size={29} />

                <strong>
                  لا توجد حملات
                </strong>

                <span>
                  الحملات المرسلة ستظهر هنا.
                </span>
              </div>
            ) : (
              <div
                className={
                  styles.campaignsList
                }
              >
                {filteredCampaigns.map(
                  (campaign) => (
                    <article
                      key={campaign.id}
                    >
                      <span
                        className={
                          styles.campaignIcon
                        }
                      >
                        <BellRing
                          size={17}
                        />
                      </span>

                      <div
                        className={
                          styles.campaignCopy
                        }
                      >
                        <strong>
                          {campaign.title}
                        </strong>

                        <p>
                          {campaign.message}
                        </p>

                        <small>
                          {getAudienceLabel(
                            campaign,
                            users,
                          )}
                          {" · "}
                          {formatDateTime(
                            campaign.created_at,
                          )}
                        </small>
                      </div>

                      <div
                        className={
                          styles.campaignSide
                        }
                      >
                        <span>
                          <UsersRound
                            size={13}
                          />

                          {Number(
                            campaign.recipients_count,
                          ).toLocaleString(
                            "ar-EG",
                          )}
                        </span>

                        <button
                          type="button"
                          onClick={() =>
                            setSelectedCampaign(
                              campaign,
                            )
                          }
                        >
                          <Eye size={15} />
                        </button>
                      </div>
                    </article>
                  ),
                )}
              </div>
            )}
          </section>
        </div>

        <aside className={styles.previewColumn}>
          <section className={styles.notificationPreview}>
            <header>
              <Eye size={18} />

              <div>
                <strong>
                  معاينة الإشعار
                </strong>

                <small>
                  الشكل المتوقع داخل الحساب.
                </small>
              </div>
            </header>

            <article>
              <span>
                <BellRing size={19} />
              </span>

              <div>
                <strong>
                  {title ||
                    "عنوان الإشعار"}
                </strong>

                <p>
                  {message ||
                    "نص الإشعار سيظهر هنا قبل الإرسال."}
                </p>

                <small>
                  الآن
                </small>
              </div>

              <ChevronLeft
                size={16}
              />
            </article>

            {actionUrl && (
              <div
                className={
                  styles.actionPreview
                }
              >
                الرابط:{" "}
                <strong>
                  {actionUrl}
                </strong>
              </div>
            )}
          </section>

          <section className={styles.sendSummary}>
            <header>
              <Send size={18} />

              <strong>
                ملخص الإرسال
              </strong>
            </header>

            <div>
              <span>
                الجمهور
              </span>

              <strong>
                {
                  audienceOptions.find(
                    (item) =>
                      item.value ===
                      audienceType,
                  )?.label
                }
              </strong>
            </div>

            <div>
              <span>
                المستلمون
              </span>

              <strong>
                {recipientsPreview.toLocaleString(
                  "ar-EG",
                )}
              </strong>
            </div>

            <div>
              <span>
                نوع الرسالة
              </span>

              <strong>
                {notificationType}
              </strong>
            </div>
          </section>

          {resultMessage && (
            <p
              className={`${styles.resultMessage} ${
                resultSuccess
                  ? styles.success
                  : styles.error
              }`}
              role="status"
            >
              {resultMessage}
            </p>
          )}

          <button
            className={styles.sendButton}
            type="button"
            disabled={
              pending ||
              !title.trim() ||
              !message.trim() ||
              recipientsPreview === 0
            }
            onClick={handleSend}
          >
            {pending ? (
              <>
                <LoaderCircle
                  className={
                    styles.spinner
                  }
                  size={18}
                />

                جاري الإرسال
              </>
            ) : (
              <>
                <Send size={18} />

                إرسال الإشعار
              </>
            )}
          </button>

          <button
            className={styles.resetButton}
            type="button"
            disabled={pending}
            onClick={resetForm}
          >
            مسح البيانات
          </button>
        </aside>
      </section>

      {selectedCampaign && (
        <div className={styles.modalOverlay}>
          <button
            type="button"
            className={styles.modalBackdrop}
            aria-label="إغلاق"
            onClick={() =>
              setSelectedCampaign(
                null,
              )
            }
          />

          <section className={styles.campaignModal}>
            <header>
              <div>
                <span>
                  CAMPAIGN DETAILS
                </span>

                <h2>
                  تفاصيل الحملة
                </h2>
              </div>

              <button
                type="button"
                onClick={() =>
                  setSelectedCampaign(
                    null,
                  )
                }
                aria-label="إغلاق"
              >
                ×
              </button>
            </header>

            <div>
              <section>
                <strong>
                  {selectedCampaign.title}
                </strong>

                <p>
                  {selectedCampaign.message}
                </p>
              </section>

              <dl>
                <div>
                  <dt>
                    نوع الإشعار
                  </dt>

                  <dd>
                    {
                      selectedCampaign.notification_type
                    }
                  </dd>
                </div>

                <div>
                  <dt>
                    الجمهور
                  </dt>

                  <dd>
                    {getAudienceLabel(
                      selectedCampaign,
                      users,
                    )}
                  </dd>
                </div>

                <div>
                  <dt>
                    عدد المستلمين
                  </dt>

                  <dd>
                    {Number(
                      selectedCampaign.recipients_count,
                    ).toLocaleString(
                      "ar-EG",
                    )}
                  </dd>
                </div>

                <div>
                  <dt>
                    تاريخ الإرسال
                  </dt>

                  <dd>
                    {formatDateTime(
                      selectedCampaign.created_at,
                    )}
                  </dd>
                </div>

                <div>
                  <dt>
                    رابط الإجراء
                  </dt>

                  <dd>
                    {selectedCampaign.action_url ||
                      "بدون رابط"}
                  </dd>
                </div>
              </dl>
            </div>
          </section>
        </div>
      )}
    </section>
  );
}