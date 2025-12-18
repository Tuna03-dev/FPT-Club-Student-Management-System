import React from "react";
import { Link } from "react-router-dom";
import type { FeaturedClub } from "../../types/homepage";

interface Props {
  clubs: FeaturedClub[];
}

const FeaturedClubs: React.FC<Props> = ({ clubs }) => {
  if (!clubs?.length) return null;

  return (
    <section className="mt-16">
      {/* ===== TITLE AS CTA BUTTON ===== */}
      <div className="flex justify-center mb-12">
        <Link
          to="/clubs"
          className="
            inline-flex
            items-center
            justify-center
            px-10 py-4
            rounded-full
            bg-[#ff6b35]
            text-white
            text-xl
            font-bold
            uppercase
            tracking-wide
            shadow-xl
            hover:bg-[#e55a2b]
            hover:scale-105
            transition
          "
        >
          Khám Phá Cộng Đồng CLB
        </Link>
      </div>

      {/* ===== CLUB GRID ===== */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
        {clubs.slice(0, 4).map((club) => (
          <Link
            key={club.id}
            to={`/clubs/${club.id}`}
            className="group text-center"
          >
            {/* CARD IMAGE */}
            <div
              className="
                relative
                bg-white
                rounded-xl
                aspect-square
                overflow-hidden
                shadow-sm
                group-hover:shadow-lg
                group-hover:-translate-y-1
                transition-all
              "
            >
              <img
                src={club.logoUrl || "/default-fallback-image.png"}
                alt={club.clubName}
                className="absolute inset-0 w-full h-full object-cover"
              />

              {/* hover overlay */}
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition" />
            </div>

            {/* CLUB INFO */}
            <h4 className="font-bold mt-4">{club.clubName}</h4>

            <p className="text-sm text-gray-500 line-clamp-2">
              {club.description}
            </p>
          </Link>
        ))}
      </div>
    </section>
  );
};

export default FeaturedClubs;
