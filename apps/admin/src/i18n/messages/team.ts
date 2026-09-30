import { defineMessages } from "../define";

export const team = defineMessages({
  "team.subtitle": {
    en: "People in your organization and their roles. DJs work in the desktop app.",
    ru: "Люди вашей организации и их роли. Диджеи работают в десктоп-приложении.",
    uz: "Tashkilotingiz aʼzolari va ularning rollari. DJlar desktop ilovada ishlaydi.",
  },
  "team.invite": { en: "Invite", ru: "Пригласить", uz: "Taklif qilish" },
  "team.invite.hint": {
    en: "We generate a link you can send in any messenger.",
    ru: "Мы создадим ссылку, которую можно отправить в любом мессенджере.",
    uz: "Har qanday messenjerda yuborish mumkin boʻlgan havola yaratamiz.",
  },
  "team.invite.send": { en: "Create invite", ru: "Создать приглашение", uz: "Taklif yaratish" },
  "team.invite.ready": {
    en: "Invite link is ready",
    ru: "Ссылка-приглашение готова",
    uz: "Taklif havolasi tayyor",
  },
  "team.invite.readyHint": {
    en: "Send this link to {email}.",
    ru: "Отправьте эту ссылку: {email}.",
    uz: "Bu havolani yuboring: {email}.",
  },
  "team.invite.link": { en: "Invitation link", ru: "Ссылка-приглашение", uz: "Taklif havolasi" },
  "team.invite.copyLink": {
    en: "Copy invitation link",
    ru: "Копировать ссылку-приглашение",
    uz: "Taklif havolasini nusxalash",
  },
  "team.invite.expires": {
    en: "The link works for 7 days and only once. It is shown only now, so copy it.",
    ru: "Ссылка действует 7 дней и один раз. Показывается только сейчас, скопируйте её.",
    uz: "Havola 7 kun va bir marta ishlaydi. Faqat hozir koʻrsatiladi, nusxalab oling.",
  },
  "team.invite.another": { en: "Invite another", ru: "Пригласить ещё", uz: "Yana taklif qilish" },
  "team.roleHint.owner": {
    en: "Full access, including owners and billing.",
    ru: "Полный доступ, включая владельцев и биллинг.",
    uz: "Toʻliq kirish, jumladan egalar va toʻlovlar.",
  },
  "team.roleHint.admin": {
    en: "Manages venues, codes, people and moderation.",
    ru: "Управляет заведениями, кодами, людьми и модерацией.",
    uz: "Muassasalar, kodlar, odamlar va moderatsiyani boshqaradi.",
  },
  "team.roleHint.dj": {
    en: "Runs sessions in the desktop app. No admin panel.",
    ru: "Ведёт сессии в десктоп-приложении. Без админ-панели.",
    uz: "Desktop ilovada seans yuritadi. Admin panelsiz.",
  },
  "team.col.member": { en: "Member", ru: "Участник", uz: "Aʼzo" },
  "team.col.role": { en: "Role", ru: "Роль", uz: "Rol" },
  "team.col.status": { en: "Status", ru: "Статус", uz: "Holat" },
  "team.col.joined": { en: "Added", ru: "Добавлен", uz: "Qoʻshilgan" },
  "team.status.active": { en: "Active", ru: "Активен", uz: "Faol" },
  "team.status.invited": { en: "Invited", ru: "Приглашён", uz: "Taklif qilingan" },
  "team.you": { en: "you", ru: "вы", uz: "siz" },
  "team.empty.title": {
    en: "No one here yet",
    ru: "Пока никого нет",
    uz: "Hozircha hech kim yoʻq",
  },
  "team.empty.description": {
    en: "Invite your DJs and admins.",
    ru: "Пригласите диджеев и администраторов.",
    uz: "DJlar va administratorlarni taklif qiling.",
  },
  "team.roleChanged": {
    en: "{name} is now {role}",
    ru: "{name}: теперь {role}",
    uz: "{name}: endi {role}",
  },
  "team.roleChangeFailed": {
    en: "Could not change the role",
    ru: "Не удалось изменить роль",
    uz: "Rolni oʻzgartirib boʻlmadi",
  },
  "team.newLink": { en: "New invite link", ru: "Новая ссылка", uz: "Yangi havola" },
  "team.remove": {
    en: "Remove from organization",
    ru: "Убрать из организации",
    uz: "Tashkilotdan chiqarish",
  },
  "team.revoke": { en: "Revoke invite", ru: "Отозвать приглашение", uz: "Taklifni bekor qilish" },
  "team.remove.title": { en: "Remove {name}?", ru: "Убрать {name}?", uz: "{name} chiqarilsinmi?" },
  "team.remove.description": {
    en: "They lose access to this organization immediately.",
    ru: "Доступ к организации пропадёт сразу.",
    uz: "Tashkilotga kirish darhol yoʻqoladi.",
  },
  "team.revoke.title": {
    en: "Revoke this invitation?",
    ru: "Отозвать приглашение?",
    uz: "Taklif bekor qilinsinmi?",
  },
  "team.revoke.description": {
    en: "The link will stop working.",
    ru: "Ссылка перестанет работать.",
    uz: "Havola ishlamay qoladi.",
  },
  "team.removed": {
    en: "{name} was removed",
    ru: "{name} удалён из организации",
    uz: "{name} tashkilotdan chiqarildi",
  },
  "team.inviteRevoked": {
    en: "Invitation revoked",
    ru: "Приглашение отозвано",
    uz: "Taklif bekor qilindi",
  },
  "team.removeFailed": {
    en: "Could not remove",
    ru: "Не удалось удалить",
    uz: "Oʻchirib boʻlmadi",
  },
  "team.lock.permission": {
    en: "Your role cannot change this member.",
    ru: "Ваша роль не позволяет менять этого участника.",
    uz: "Sizning rolingiz bu aʼzoni oʻzgartirishga ruxsat bermaydi.",
  },
  "team.lock.self": {
    en: "You cannot remove yourself.",
    ru: "Себя удалить нельзя.",
    uz: "Oʻzingizni oʻchira olmaysiz.",
  },
  "team.lastOwnerNote": {
    en: "There is one owner. To hand over ownership, promote another member first.",
    ru: "Владелец один. Чтобы передать права, сначала назначьте владельцем другого участника.",
    uz: "Egasi bitta. Huquqni topshirish uchun avval boshqa aʼzoni ega qilib tayinlang.",
  },
  "capability.use-admin-panel": {
    en: "Open admin panel",
    ru: "Доступ в админ-панель",
    uz: "Admin panelga kirish",
  },
  "capability.manage-venues": {
    en: "Manage venues",
    ru: "Управление заведениями",
    uz: "Muassasalarni boshqarish",
  },
  "capability.manage-qr": {
    en: "Manage QR codes",
    ru: "Управление QR-кодами",
    uz: "QR-kodlarni boshqarish",
  },
  "capability.manage-members": {
    en: "Manage people",
    ru: "Управление людьми",
    uz: "Odamlarni boshqarish",
  },
  "capability.manage-owners": {
    en: "Manage owners",
    ru: "Управление владельцами",
    uz: "Egalarni boshqarish",
  },
  "capability.manage-moderation": { en: "Moderation", ru: "Модерация", uz: "Moderatsiya" },
  "capability.view-analytics": {
    en: "View analytics",
    ru: "Просмотр аналитики",
    uz: "Tahlilni koʻrish",
  },
  "capability.view-audit": {
    en: "View audit log",
    ru: "Просмотр журнала аудита",
    uz: "Audit jurnalini koʻrish",
  },
  "capability.delete-venue": {
    en: "Delete venues",
    ru: "Удаление заведений",
    uz: "Muassasalarni oʻchirish",
  },
});
