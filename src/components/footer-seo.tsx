"use client";

import React, { useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";

export function FooterSEO() {
  const [expanded, setExpanded] = useState(false);

  return (
    <section className="relative z-10 w-full px-4 py-8 max-w-5xl mx-auto text-left" aria-label="Về Word Fight">
      <div className="rounded-[28px] border border-primary/20 bg-background/50 backdrop-blur-md p-6 shadow-sm">
        <h2 className="text-lg font-black text-foreground mb-3">
          Trải Nghiệm Game Nối Từ & Vua Tiếng Việt Online Miễn Phí
        </h2>

        <div className={`relative overflow-hidden transition-all duration-300 ${expanded ? "max-h-none" : "max-h-[110px]"}`}>
          <div className="space-y-4 text-xs sm:text-sm text-muted-foreground leading-relaxed">
            <p>
              Trong kỷ nguyên số, trải nghiệm những giờ phút thư giãn cùng bạn bè thông qua việc chơi game nối từ online là một phương pháp tuyệt vời để vừa giải trí vừa trau dồi vốn từ. Nếu bạn đang tìm kiếm một nền tảng chơi nối từ tiếng Việt hay nối từ tiếng Anh mượt mà, tiện lợi mà không cần cài đặt phức tạp, <strong>Word Fight</strong> là một lựa chọn hoàn hảo.
            </p>
            <p>
              Khác với nhiều trò chơi nối từ truyền thống chỉ tập trung vào giải trí, Word Fight được thiết kế để giúp người học rèn phản xạ từ vựng tiếng Anh và tiếng Việt thông qua các trận đấu thời gian thực. Bằng việc tối ưu hóa giao diện và trải nghiệm, nền tảng hướng tới mục tiêu hỗ trợ bạn nâng cấp tư duy ngôn ngữ một cách tự nhiên nhất.
            </p>
            <h3 className="font-bold text-foreground text-sm">
              Khám Phá Các Chế Độ Chơi Hấp Dẫn Trên Word Fight:
            </h3>
            <ul className="list-disc list-inside space-y-1.5 pl-2">
              <li>
                <strong>👑 Vua Tiếng Việt:</strong> Thử thách giải đố với hàng chục màn chơi sắp xếp chữ cái tiếng Việt hóc búa, nhận sao và quà tặng.
              </li>
              <li>
                <strong>🟢 Nối Từ Tiếng Việt:</strong> Đấu từ ghép 2 âm tiết nghẹt thở cùng bot AI thông minh hoặc bạn bè.
              </li>
              <li>
                <strong>🔵 Nối Từ Tiếng Anh:</strong> Rèn luyện phản xạ từ vựng tiếng Anh qua chữ cái kết thúc, nâng cao vốn từ vựng mỗi ngày.
              </li>
              <li>
                <strong>⚔️ Tạo / Tìm Phòng Đấu Bạn Bè:</strong> Đấu trường nhiều người thời gian thực với mã phòng riêng biệt và hệ thống phòng chờ tương tác.
              </li>
            </ul>
          </div>

          {!expanded && (
            <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-background/95 to-transparent pointer-events-none" />
          )}
        </div>

        <button
          type="button"
          onClick={() => setExpanded(!expanded)}
          className="mt-3 flex items-center gap-1 text-xs font-bold text-primary hover:underline cursor-pointer"
        >
          {expanded ? (
            <>
              Thu gọn <ChevronUp className="h-3.5 w-3.5" />
            </>
          ) : (
            <>
              Xem thêm chi tiết <ChevronDown className="h-3.5 w-3.5" />
            </>
          )}
        </button>
      </div>

      <p className="mt-6 text-center text-xs text-muted-foreground">
        © 2026 WordFight. All rights reserved. Game Nối Chữ Online & Vua Tiếng Việt.
      </p>
    </section>
  );
}
