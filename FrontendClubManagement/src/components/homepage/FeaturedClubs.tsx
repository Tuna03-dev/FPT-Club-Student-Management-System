import React from "react"
import type { FeaturedClub } from "../../types/homepage"

interface Props {
  clubs: FeaturedClub[]
}

const FeaturedClubs: React.FC<Props> = ({ clubs }) => {
  if (!clubs?.length) return null

  return (
    <section className="mt-16">
      <h2 className="text-3xl font-bold text-center mb-12">Khám Phá Cộng Đồng CLB</h2>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
        {clubs.slice(0, 4).map((club) => (
          <a key={club.id} href={`/clubs/${club.id}`} className="group text-center">
            <div className="bg-white rounded-xl p-6 aspect-square flex items-center justify-center group-hover:shadow-lg group-hover:-translate-y-1 transition-all">
              <img
                src={club.logoUrl || "/default-fallback-image.png"}
                alt={club.clubName}
                className="max-h-20 object-contain"
              />
            </div>
            <h4 className="font-bold mt-4">{club.clubName}</h4>
            <p className="text-sm text-gray-500">{club.description}</p>
          </a>
        ))}
      </div>
    </section>
  )
}

export default FeaturedClubs
