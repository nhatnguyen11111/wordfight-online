// Word Chain Levels Definition with Progressive Difficulty Scaling and Standard Turn Time
export interface WordChainLevel {
  id: number;
  opponentName: string;
  opponentAvatarColor: string;
  starterWord: string;
  starterMeaning: string;
  targetWords: number; // Số cặp từ cần nối
  gemsReward: number;
  timerSec: number;
}

export const VIETNAMESE_CHAIN_LEVELS: WordChainLevel[] = [
  {
    id: 1,
    opponentName: "Tập Sự",
    opponentAvatarColor: "from-blue-400 to-indigo-600",
    starterWord: "học sinh",
    starterMeaning: "Người đang theo học ở các trường bậc phổ thông",
    targetWords: 3, // Màn 1: 3 cặp từ
    gemsReward: 3,
    timerSec: 20,
  },
  {
    id: 2,
    opponentName: "Minh Anh",
    opponentAvatarColor: "from-teal-400 to-emerald-600",
    starterWord: "chặt thịt",
    starterMeaning: "Hành động dùng dao chặt đồ vật, thường là thực phẩm",
    targetWords: 5, // Màn 2: 5 cặp từ
    gemsReward: 4,
    timerSec: 20,
  },
  {
    id: 3,
    opponentName: "Thiên Lý Ơi",
    opponentAvatarColor: "from-pink-400 to-rose-600",
    starterWord: "mặt trời",
    starterMeaning: "Thiên thể trung tâm của Hệ Mặt Trời, chiếu sáng Trái Đất",
    targetWords: 6, // Màn 3: 6 cặp từ
    gemsReward: 5,
    timerSec: 20,
  },
  {
    id: 4,
    opponentName: "Jack",
    opponentAvatarColor: "from-amber-500 to-red-600",
    starterWord: "nói kháy",
    starterMeaning: "Nói có ý châm chọc, gián tiếp mỉa mai người khác",
    targetWords: 7, // Màn 4: 7 cặp từ
    gemsReward: 5,
    timerSec: 18,
  },
  {
    id: 5,
    opponentName: "Bảo Long",
    opponentAvatarColor: "from-purple-400 to-violet-600",
    starterWord: "công nghệ",
    starterMeaning: "Tập hợp các phương pháp, kỹ năng và quy trình tạo ra sản phẩm",
    targetWords: 8, // Màn 5: 8 cặp từ
    gemsReward: 6,
    timerSec: 18,
  },
  {
    id: 6,
    opponentName: "Huyền My",
    opponentAvatarColor: "from-rose-400 to-pink-600",
    starterWord: "hoa hồng",
    starterMeaning: "Loài hoa đẹp có gai, biểu tượng của tình yêu nồng thắm",
    targetWords: 9, // Màn 6: 9 cặp từ
    gemsReward: 7,
    timerSec: 18,
  },
  {
    id: 7,
    opponentName: "Quang Hải",
    opponentAvatarColor: "from-emerald-400 to-green-600",
    starterWord: "thành phố",
    starterMeaning: "Đô thị tập trung đông dân cư với cơ sở hạ tầng phát triển",
    targetWords: 10, // Màn 7: 10 cặp từ
    gemsReward: 8,
    timerSec: 16,
  },
  {
    id: 8,
    opponentName: "Thanh Hằng",
    opponentAvatarColor: "from-teal-400 to-cyan-600",
    starterWord: "bầu trời",
    starterMeaning: "Khoảng không gian vô tận nhìn thấy từ bề mặt Trái Đất",
    targetWords: 12, // Màn 8: 12 cặp từ
    gemsReward: 10,
    timerSec: 16,
  },
  {
    id: 9,
    opponentName: "Cao Thủ Nối Từ",
    opponentAvatarColor: "from-indigo-400 to-purple-600",
    starterWord: "suy nghĩ",
    starterMeaning: "Hoạt động tư duy của não bộ nhằm xử lý thông tin",
    targetWords: 14, // Màn 9: 14 cặp từ
    gemsReward: 12,
    timerSec: 15,
  },
  {
    id: 10,
    opponentName: "Vua Nối Từ",
    opponentAvatarColor: "from-amber-400 to-yellow-600",
    starterWord: "khai sáng",
    starterMeaning: "Mở mang trí tuệ, đem lại sự hiểu biết sâu sắc",
    targetWords: 16, // Màn 10: 16 cặp từ
    gemsReward: 15,
    timerSec: 15,
  },
];

export const ENGLISH_CHAIN_LEVELS: WordChainLevel[] = [
  {
    id: 1,
    opponentName: "Novice",
    opponentAvatarColor: "from-blue-400 to-indigo-600",
    starterWord: "apple",
    starterMeaning: "A round fruit with red, yellow, or green skin and firm white flesh",
    targetWords: 3,
    gemsReward: 3,
    timerSec: 20,
  },
  {
    id: 2,
    opponentName: "Sophia",
    opponentAvatarColor: "from-pink-400 to-rose-600",
    starterWord: "energy",
    starterMeaning: "The strength and vitality required for sustained activity",
    targetWords: 5,
    gemsReward: 4,
    timerSec: 20,
  },
  {
    id: 3,
    opponentName: "Liam",
    opponentAvatarColor: "from-emerald-400 to-green-600",
    starterWord: "planet",
    starterMeaning: "A celestial body moving in an elliptical orbit around a star",
    targetWords: 6,
    gemsReward: 5,
    timerSec: 20,
  },
  {
    id: 4,
    opponentName: "Emma",
    opponentAvatarColor: "from-amber-400 to-orange-600",
    starterWord: "nature",
    starterMeaning: "The phenomena of the physical world collectively",
    targetWords: 7,
    gemsReward: 6,
    timerSec: 18,
  },
  {
    id: 5,
    opponentName: "Master Word",
    opponentAvatarColor: "from-purple-500 to-indigo-600",
    starterWord: "galaxy",
    starterMeaning: "A system of millions or billions of stars, together with gas and dust",
    targetWords: 10,
    gemsReward: 10,
    timerSec: 15,
  },
];
