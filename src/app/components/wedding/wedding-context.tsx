import React, { createContext, useContext, useState } from "react";

export type Lang = "EN" | "TH";

export const translations = {
  EN: {
    invitation_pre: "You are cordially invited to celebrate",
    ampersand: "&",
    together: "Together with their families",
    parents_groom: "Mr. Winai & Mrs. Anong",
    parents_bride: "Mr. Natthawut & Mrs. Ratchatana",
    invite_line: "Joyfully invite you to the wedding celebration of",
    bride_title: "Flt. Lt.",
    bride_name: "Pantika Setboonsrang",
    groom_title: "Mr.",
    groom_name: "Natthakorn Suppasuesanguan",
    opening:
      "With hearts full of joy and gratitude, we warmly invite you to share in our celebration of love — a gathering among dear friends and family, in the spirit of home.",
    scroll: "Scroll",
    save_the_date: "Save the Date",
    sunday: "Sunday",
    ceremony: "Engagement",
    reception: "Welcome Photos",
    celebration: "Celebration",
    venue_label: "Venue",
    venue_name_line1: "SailomSangdad",
    venue_name_line2: "Homey Studio",
    venue_desc:
      "A charming garden studio nestled in a cozy homey setting — the perfect backdrop for an intimate celebration of love and togetherness.",
    directions: "Get Directions",
    program_label: "Program of Events",
    program: [
      { time: "16:09", title: "Engagement Ceremony", desc: "An intimate ring exchange ceremony with close family." },
      { time: "17:00", title: "Photos & Drinks", desc: "Gathering with guests — photos, laughter, and champagne canapés." },
      { time: "17:30", title: "Dinner & Dancing", desc: "Music, toasts, and memories made under glowing garden lights." },
    ],
    direction_items: [
      { icon: "🚗", title: "By Car", text: "25 min from Siam, free parking on site" },
      { icon: "🚇", title: "By BTS/MRT", text: "Take BTS to On Nut, then 10 min by taxi" },
      { icon: "🛺", title: "By Grab", text: "Search 'SailomSangdad Homey Studio'" },
    ],
    countdown_label: "Counting Down To Our Special Day",
    countdown_subtitle: "We can't wait to celebrate with you",
    countdown_caption: "until we say I do",
    gallery_label: "Gallery",
    story_label: "Our Story",
    story_subtitle: "A love written in moments",
    story_items: [
      { year: "2020", title: "First Meeting", caption: "Two souls finding each other in the most unexpected place." },
      { year: "2022", title: "Adventures Together", caption: "Every journey became more beautiful with you by my side." },
      { year: "2024", title: "The Proposal", caption: "With a song written just for you, I asked for forever." },
      { year: "2026", title: "Forever Begins", caption: "And now we write our greatest chapter together." },
    ],
    hashtag: "#PNEST221126",
    hashtag_sub: "Share your memories with us",
    map_title: "SailomSangdad Homey Studio",
    map_address: "Ram Intra 40, Bangkok",
    map_btn: "Open in Google Maps",
    dress_label: "Dress Code",
    dress_title: "Garden Chic",
    dress_desc:
      "We invite you to dress in warm, earthy tones — rich browns, golden yellows, and garden greens. Celebrate the day in comfort and elegance.",
    rsvp_label: "RSVP",
    rsvp_title: "Will You Join Us?",
    rsvp_subtitle: "Kindly reply by October 1, 2026",
    rsvp_name: "Your Full Name",
    rsvp_email: "Email Address",
    rsvp_attend: "Will you attend?",
    rsvp_yes: "Joyfully Accept",
    rsvp_no: "Regretfully Decline",
    rsvp_guests: "Number of Guests",
    rsvp_guests_help: "Including yourself",
    rsvp_importance:
      "Your RSVP helps us make sure everything is perfect — from the seating to the food to every last detail.",
    rsvp_dietary: "Dietary Preferences / Notes",
    rsvp_submit: "Send RSVP",
    rsvp_sending: "Sending...",
    rsvp_error: "Something went wrong — please try again.",
    rsvp_thanks: "Thank you! We look forward to celebrating with you.",
    rsvp_sorry: "We will miss you dearly. Thank you for letting us know.",
    quote_line1: "“Being deeply loved by someone gives you strength,",
    quote_line2: "while loving someone deeply gives you courage.”",
    quote_author: "— Lao Tzu",
    gift_heading: "A gift for our new journey",
    gift_tap: "Tap to give a gift",
    gift_closing: "Your presence is the greatest gift of all",
    gift_save: "Save QR code",
    gift_save_hint: "Then scan it from your photos in your banking app",
    song_title: "Pantika",
    song_dedication: "Written for her, on the day I asked forever",
    song_play: "Play our song",
    music_label: "Our Song",
    music_title: "Pantika (Proposal Song)",
    music_note: "♪ A song written with love",
    music_youtube: "▶  Also on YouTube",
  },
  TH: {
    invitation_pre: "ขอเชิญร่วมแบ่งปันความสุขในพิธีมงคลสมรส",
    ampersand: "&",
    together: "พร้อมด้วยสองครอบครัว",
    parents_groom: "คุณพ่อ วินัย & คุณแม่ อนงค์",
    parents_bride: "คุณพ่อ ณัฐวุฒิ & คุณแม่ รัชตนา",
    invite_line: "ขอเรียนเชิญร่วมแสดงความยินดีในงานมงคลสมรส",
    bride_title: "ร.อ.หญิง",
    bride_name: "ปัณฑิกา เศรษฐ์บุญสร้าง",
    groom_title: "นาย",
    groom_name: "ณัฐกร ศุภซื่อสงวน",
    opening:
      "ด้วยใจที่เปี่ยมล้นด้วยความสุขและความซาบซึ้ง เราขอเชิญคุณมาร่วมเฉลิมฉลองความรักของเรา — การรวมตัวของเพื่อนสนิทและครอบครัวในบรรยากาศอบอุ่นเสมือนบ้าน",
    scroll: "เลื่อน",
    save_the_date: "จดวันสำคัญไว้ในใจ",
    sunday: "วันอาทิตย์",
    ceremony: "พิธีหมั้น",
    reception: "ร่วมถ่ายภาพ",
    celebration: "งานเลี้ยงฉลอง",
    venue_label: "สถานที่จัดงาน",
    venue_name_line1: "บ้านสายลมแสงแดด",
    venue_name_line2: "",
    venue_desc:
      "สตูดิโอสวนที่เงียบสงบและอบอุ่น — ฉากหลังที่สมบูรณ์แบบสำหรับการเฉลิมฉลองความรักอย่างเป็นส่วนตัว",
    directions: "ดูเส้นทาง",
    program_label: "กำหนดการงาน",
    program: [
      { time: "16:09", title: "พิธีหมั้น", desc: "พิธีแลกแหวนอย่างเป็นส่วนตัวกับครอบครัวที่รัก" },
      { time: "17:00", title: "ร่วมถ่ายภาพ", desc: "รวมตัวกับแขกผู้มีเกียรติ — ถ่ายภาพ หัวเราะ และแชมเปญ" },
      { time: "17:30", title: "งานเลี้ยงฉลอง", desc: "ดนตรี การชนแก้ว และความทรงจำใต้แสงไฟสวนงดงาม" },
    ],
    direction_items: [
      { icon: "🚗", title: "เดินทางโดยรถยนต์", text: "25 นาทีจากสยาม มีที่จอดรถฟรีในงาน" },
      { icon: "🚇", title: "โดย BTS/MRT", text: "นั่ง BTS ลงสถานีอ่อนนุช ต่อแท็กซี่อีก 10 นาที" },
      { icon: "🛺", title: "โดย Grab", text: "ค้นหา 'SailomSangdad Homey Studio'" },
    ],
    countdown_label: "นับถอยหลังสู่วันพิเศษของเรา",
    countdown_subtitle: "เราตั้งตารอที่จะได้เฉลิมฉลองร่วมกับคุณ",
    countdown_caption: "จนกว่าเราจะได้กล่าวคำสัญญารัก",
    gallery_label: "แกลเลอรี",
    story_label: "เรื่องราวของเรา",
    story_subtitle: "ความรักที่เขียนขึ้นจากทุกช่วงเวลา",
    story_items: [
      { year: "2020", title: "การพบกันครั้งแรก", caption: "สองดวงวิญญาณที่ค้นพบกันในสถานที่ที่ไม่คาดคิด" },
      { year: "2022", title: "การผจญภัยร่วมกัน", caption: "ทุกการเดินทางสวยงามยิ่งขึ้นเมื่อมีคุณอยู่เคียงข้าง" },
      { year: "2024", title: "การขอแต่งงาน", caption: "ด้วยเพลงที่เขียนขึ้นเพื่อคุณโดยเฉพาะ ฉันขอมอบชีวิตทั้งชีวิต" },
      { year: "2026", title: "จุดเริ่มต้นของนิรันดร์", caption: "และตอนนี้เราจะเขียนบทที่ยิ่งใหญ่ที่สุดด้วยกัน" },
    ],
    hashtag: "#PNEST221126",
    hashtag_sub: "แชร์ความทรงจำของคุณกับเรา",
    map_title: "บ้านสายลมแสงแดด",
    map_address: "รามอินทรา 40 กรุงเทพมหานคร",
    map_btn: "เปิดใน Google Maps",
    dress_label: "การแต่งกาย",
    dress_title: "สวนชิค",
    dress_desc:
      "ขอเชิญสวมใส่เสื้อผ้าโทนสีอบอุ่น — น้ำตาล ทอง และเขียวสวน เฉลิมฉลองด้วยความสะดวกสบายและความงดงาม",
    rsvp_label: "ตอบรับคำเชิญ",
    rsvp_title: "คุณจะมาร่วมงานกับเราไหม?",
    rsvp_subtitle: "กรุณาตอบรับภายใน 1 ตุลาคม 2569",
    rsvp_name: "ชื่อ-นามสกุล",
    rsvp_email: "อีเมลของคุณ",
    rsvp_attend: "คุณจะมาร่วมงานหรือไม่?",
    rsvp_yes: "ยินดีตอบรับ",
    rsvp_no: "ขอแสดงความเสียใจที่ไม่สะดวก",
    rsvp_guests: "จำนวนผู้เข้าร่วม",
    rsvp_guests_help: "รวมตัวคุณด้วย",
    rsvp_importance:
      "การตอบรับของคุณช่วยให้เราเตรียมทุกอย่างได้อย่างพอดี ทั้งที่นั่ง อาหาร และทุกรายละเอียด",
    rsvp_dietary: "อาหารที่แพ้หรือหมายเหตุเพิ่มเติม",
    rsvp_submit: "ส่งการตอบรับ",
    rsvp_sending: "กำลังส่ง...",
    rsvp_error: "เกิดข้อผิดพลาด — กรุณาลองอีกครั้ง",
    rsvp_thanks: "ขอบคุณมาก! เราตื่นเต้นที่จะได้เจอคุณในวันนั้น",
    rsvp_sorry: "เราจะคิดถึงคุณมาก ขอบคุณที่แจ้งให้เราทราบ",
    quote_line1: "“การได้รับความรักอย่างลึกซึ้งจากใครสักคน ทำให้คุณเข้มแข็ง",
    quote_line2: "ส่วนการรักใครสักคนอย่างลึกซึ้ง ทำให้คุณกล้าหาญ”",
    quote_author: "— เล่าจื๊อ",
    gift_heading: "ของขวัญสำหรับการเดินทางครั้งใหม่ของเรา",
    gift_tap: "แตะเพื่อใส่ซอง",
    gift_closing: "ของขวัญที่ดีที่สุดคือการมาร่วมแสดงความยินดี",
    gift_save: "บันทึก QR",
    gift_save_hint: "แล้วสแกนจากอัลบั้มรูปในแอปธนาคาร",
    song_title: "Pantika",
    song_dedication: "เพลงที่เขาแต่งให้เธอ ในวันที่เขาขอแต่งงาน",
    song_play: "ฟังเพลงของเรา",
    music_label: "เพลงของเรา",
    music_title: "Pantika (เพลงขอแต่งงาน)",
    music_note: "♪ เพลงที่เขียนด้วยความรัก",
    music_youtube: "▶  ฟังบน YouTube",
  },
};

const LangContext = createContext<{
  lang: Lang;
  setLang: (l: Lang) => void;
  t: typeof translations.EN;
}>({
  lang: "EN",
  setLang: () => {},
  t: translations.EN,
});

export function LangProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLang] = useState<Lang>("TH");
  return (
    <LangContext.Provider value={{ lang, setLang, t: translations[lang] }}>
      {children}
    </LangContext.Provider>
  );
}

export function useLang() {
  return useContext(LangContext);
}
