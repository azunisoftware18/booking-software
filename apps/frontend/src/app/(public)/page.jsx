"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import BookNowBtn from "@/components/ui/BookNowBtn";
import Banners from "@/components/common/home/Banners";
import Link from "next/link";
import Image from "next/image";
import { usePlaces } from "@/hooks/usePlace";
import GuidBanner from "@/components/common/home/GuidBanner";
import { ChevronsUp, MapPin, ArrowRight, ChevronLeft, ChevronRight, Star } from "lucide-react";

const fadeInUp = {
  hidden: { opacity: 0, y: 30 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: "easeOut" } },
};

const cascadeContainer = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.15, delayChildren: 0.1 },
  },
};

export default function Home() {
  const { data: places = [], isLoading } = usePlaces();
  const placeId = places?.[0]?._id || places?.[0]?.id;
  const latitude = places?.[0]?.latitude;
  const longitude = places?.[0]?.longitude;
  const [isVisible, setIsVisible] = useState(false);
  const sliderRef = useRef(null);

  useEffect(() => {
    const toggleVisibility = () => {
      if (window.scrollY > 300) setIsVisible(true);
      else setIsVisible(false);
    };
    window.addEventListener("scroll", toggleVisibility);
    return () => window.removeEventListener("scroll", toggleVisibility);
  }, []);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const openGoogleMap = () => {
    if (!latitude || !longitude) return;
    window.open(
      `https://www.google.com/maps/search/?api=1&query=${latitude},${longitude}`,
      "_blank"
    );
  };

  // Slider scroll
  const scrollSlider = (dir) => {
    if (!sliderRef.current) return;
    const amount = 360;
    sliderRef.current.scrollBy({
      left: dir === "left" ? -amount : amount,
      behavior: "smooth",
    });
  };

  return (
    <>
      <AnimatePresence>
        {isVisible && (
          <motion.button
            initial={{ opacity: 0, scale: 0.8, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8, y: 20 }}
            onClick={scrollToTop}
            className="fixed bottom-8 right-8 z-50 p-3 rounded-full group cursor-pointer bg-linear-to-r from-jaipur-dark to-[#994113] text-white border-none hover:from-jaipur-dark hover:to-[#b24d18] hover:scale-[1.02] active:scale-[0.98] shadow-[0_10px_25px_rgba(153,65,19,0.3)] transition-all duration-300"
          >
            <ChevronsUp className="size-8 transition-transform group-hover:-translate-y-1" />
          </motion.button>
        )}
      </AnimatePresence>

      <section className="relative overflow-hidden select-none bg-[#F4F1DE]/20">
        <div className="font-sans bg-[#1A365D] shadow-xl/30">
          <div className="relative h-[75vh] md:h-[90vh] overflow-hidden rounded-b-[40px] md:rounded-b-[80px]">
            <motion.img
              initial={{ scale: 1.12, opacity: 0 }}
              animate={{ scale: 1.05, opacity: 1 }}
              transition={{ duration: 1.2, ease: "easeOut" }}
              src="/images/nahargarh-Fort.jpg"
              alt="Jaipur"
              className="absolute inset-0 w-full h-full object-cover opacity-85"
            />

            <div className="absolute inset-0 bg-linear-to-b from-black/60 via-black/40 to-[#1A365D]/90 backdrop-blur-[1.3px] flex items-center justify-center text-center px-4">
              <motion.div
                variants={cascadeContainer}
                initial="hidden"
                animate="visible"
                className="max-w-5xl"
              >
                <motion.p
                  variants={fadeInUp}
                  className="text-gold tracking-[6px] uppercase text-xs sm:text-sm mb-6 font-bold"
                >
                  Royal Heritage of Rajasthan
                </motion.p>

                <motion.h1
                  variants={fadeInUp}
                  className="text-white text-4xl sm:text-5xl md:text-7xl font-serif tracking-wide leading-tight drop-shadow-2xl font-normal"
                >
                  Discover Jaipur's
                  <br />
                  <span className="text-transparent bg-clip-text bg-linear-to-r from-white via-[#F4F1DE] to-gold">
                    Hidden Natural Treasure
                  </span>
                </motion.h1>

                <motion.p
                  variants={fadeInUp}
                  className="mt-8 text-white/80 text-base sm:text-lg md:text-xl leading-relaxed max-w-3xl mx-auto font-serif italic"
                >
                  Explore timeless forts, majestic palaces, and breathtaking
                  desert landscapes woven deeply into Rajasthan's royal history.
                </motion.p>
              </motion.div>
            </div>
          </div>

          <div className="relative flex justify-center px-4">
            <motion.div
              initial={{ opacity: 0, y: 40, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ type: "spring", stiffness: 100, damping: 20, delay: 0.4 }}
              className="w-full sm:w-11/12 md:w-4/5 bg-white rounded-[24px] border border-gray-100 px-6 sm:px-8 md:px-10 py-6 shadow-2xl flex flex-col md:flex-row items-start md:items-center justify-between gap-8 md:gap-12 -mt-20 z-30 relative overflow-hidden"
            >
              <div className="flex flex-col sm:flex-row flex-wrap gap-8 md:gap-12 w-full">
                <div className="flex flex-col text-left min-w-[160px]">
                  <span className="font-bold text-[#E07A5F] uppercase tracking-widest text-xs mb-2 flex items-center gap-1">
                    Location
                  </span>
                  <div className="flex justify-start">
                    <button
                      onClick={openGoogleMap}
                      className="inline-flex items-center gap-2.5 px-3 py-1.5 bg-slate-50 hover:bg-red-50/60 border border-slate-100 hover:border-red-100 rounded-full text-[#1A365D] hover:text-red-600 transition-all duration-200 group focus:outline-none focus:ring-2 focus:ring-red-200"
                    >
                      <span className="font-bold text-sm sm:text-base tracking-wide">
                        Jaipur Heritage
                      </span>
                      <div className="p-1 rounded-full bg-white group-hover:bg-red-50 shadow-sm transition-colors">
                        <MapPin
                          size={16}
                          className="text-red-500 transform group-hover:translate-y-[-1px] group-hover:scale-105 transition-all"
                        />
                      </div>
                    </button>
                  </div>
                </div>

                <div className="flex flex-col text-left">
                  <span className="font-bold text-[#E07A5F] uppercase tracking-widest text-xs">
                    Timings
                  </span>
                  <span className="text-[#1A365D] font-bold mt-4 font-mono text-sm sm:text-base">
                    5:00 AM - 8:00 PM
                  </span>
                </div>

                <div className="flex flex-col text-left">
                  <span className="font-bold text-[#E07A5F] uppercase tracking-widest text-xs">
                    Royal Experience
                  </span>
                  <span className="text-[#1A365D] font-bold mt-4 text-sm sm:text-base">
                    Premium Heritage Access
                  </span>
                </div>
              </div>

              <div className="flex-shrink-0 w-full md:w-auto">
                <Link
                  href={placeId ? `/book-tickets/${placeId}` : "#"}
                  className="inline-flex w-full md:w-auto"
                >
                  <BookNowBtn
                    title="Book Now"
                    addClass="bg-gradient-to-r from-jaipur-dark to-[#994113] text-white border-none hover:from-jaipur-dark hover:to-[#b24d18] hover:scale-[1.02] active:scale-[0.98] shadow-[0_10px_25px_rgba(153,65,19,0.3)] transition-all duration-300"
                  />
                </Link>
              </div>
            </motion.div>
          </div>
        </div>

        <section>
          <GuidBanner />
        </section>

        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
          variants={cascadeContainer}
          className="mt-24 px-4 sm:px-6 md:px-10 lg:px-20 flex justify-end"
        >
          <div className="text-right max-w-3xl">
            <motion.p
              variants={fadeInUp}
              className="font-serif font-bold text-3xl sm:text-4xl md:text-4xl leading-tight text-[#1A365D]"
            >
              Bringing the Desert Wilderness
              <br />
              Closer to the People of Jaipur
            </motion.p>

            <motion.p
              variants={fadeInUp}
              className="mt-8 text-base sm:text-lg md:text-xl leading-[2] text-black/75"
            >
              Inspired by the raw beauty of the Aravalli landscape, the Kishan
              Bagh Sand Dunes Park offers a stunning ecological retreat at the
              foot of Nahargarh hills. Elevated walkways, golden dunes, and
              native vegetation together create a timeless desert experience
              unlike any other in Rajasthan.
            </motion.p>
          </div>
        </motion.div>

        {/* ================= PLACES SECTION (NEW) ================= */}
        <section className="mt-28 mb-20 px-4 sm:px-6 md:px-10 lg:px-20 relative">
          {/* Decorative background glow */}
          <div className="absolute -top-20 left-1/2 -translate-x-1/2 w-[500px] h-[500px] bg-[#E07A5F]/5 blur-[120px] rounded-full pointer-events-none" />

          {/* Header */}
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-100px" }}
            variants={cascadeContainer}
            className="flex flex-col md:flex-row md:items-end md:justify-between gap-6 mb-12 relative z-10"
          >
            <div className="max-w-2xl text-left">
              <motion.div
                variants={fadeInUp}
                className="inline-flex items-center gap-2 px-4 py-1.5 bg-[#E07A5F]/10 rounded-full mb-5"
              >
                <Star size={14} className="text-[#E07A5F] fill-[#E07A5F]" />
                <span className="text-[#E07A5F] tracking-[3px] uppercase text-[10px] sm:text-xs font-bold">
                  Curated Destinations
                </span>
              </motion.div>

              <motion.h2
                variants={fadeInUp}
                className="font-serif font-bold text-3xl sm:text-4xl md:text-5xl leading-tight text-[#1A365D]"
              >
                Explore Our{" "}
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#1A365D] to-[#E07A5F]">
                  Popular Places
                </span>
              </motion.h2>

              <motion.p
                variants={fadeInUp}
                className="mt-5 text-base sm:text-lg leading-relaxed text-black/60 max-w-xl"
              >
                Discover handpicked destinations that capture the royal spirit,
                timeless architecture, and vibrant culture of Rajasthan.
              </motion.p>
            </div>

            {/* Slider Nav Buttons */}
            {places?.length > 0 && (
              <motion.div variants={fadeInUp} className="flex gap-3">
                <button
                  onClick={() => scrollSlider("left")}
                  aria-label="Scroll left"
                  className="p-3 rounded-full bg-white border border-[#1A365D]/10 text-[#1A365D] hover:bg-[#1A365D] hover:text-white transition-all duration-300 shadow-sm hover:shadow-lg active:scale-95"
                >
                  <ChevronLeft size={20} />
                </button>
                <button
                  onClick={() => scrollSlider("right")}
                  aria-label="Scroll right"
                  className="p-3 rounded-full bg-white border border-[#1A365D]/10 text-[#1A365D] hover:bg-[#1A365D] hover:text-white transition-all duration-300 shadow-sm hover:shadow-lg active:scale-95"
                >
                  <ChevronRight size={20} />
                </button>
              </motion.div>
            )}
          </motion.div>

          {/* Loading Skeleton */}
          {isLoading && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {[1, 2, 3, 4].map((i) => (
                <div
                  key={i}
                  className="h-96 bg-gradient-to-br from-slate-100 to-slate-200 animate-pulse rounded-[28px]"
                />
              ))}
            </div>
          )}

          {/* Empty State */}
          {!isLoading && places?.length === 0 && (
            <div className="text-center py-16 text-slate-500">
              No places available right now.
            </div>
          )}

          {/* Places Slider */}
          {!isLoading && places?.length > 0 && (
            <motion.div
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: "-50px" }}
              variants={cascadeContainer}
              ref={sliderRef}
              className="flex gap-6 overflow-x-auto pb-6 snap-x snap-mandatory scroll-smooth [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden relative z-10"
            >
              {places.map((place, idx) => {
                const id = place?._id || place?.id;
                const image =
                  place?.images?.[0]?.url ||
                  place?.image ||
                  "/images/placeholder.jpg";

                return (
                  <motion.div
                    key={id || idx}
                    variants={fadeInUp}
                    whileHover={{ y: -8 }}
                    transition={{ type: "spring", stiffness: 220, damping: 22 }}
                    className="group flex-shrink-0 w-[300px] sm:w-[340px] snap-start bg-white rounded-[28px] overflow-hidden shadow-[0_8px_30px_rgba(26,54,93,0.08)] hover:shadow-[0_20px_50px_rgba(26,54,93,0.18)] border border-slate-100 transition-all duration-500"
                  >
                    <Link href={`/book-tickets/${id}`} className="block">
                      {/* Image */}
                      <div className="relative h-64 w-full overflow-hidden">
                        <Image
                          src={place.imageUrl}
                          alt={place?.name || "Place"}
                          fill
                          sizes="(max-width: 768px) 100vw, 340px"
                          className="object-cover group-hover:scale-110 transition-transform duration-700 ease-out"
                        />
                        {/* Gradient Overlay */}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />

                        {/* City Badge */}
                        {place?.city && (
                          <span className="absolute top-4 left-4 bg-white/90 backdrop-blur-md text-[#1A365D] text-[11px] font-bold px-3 py-1.5 rounded-full flex items-center gap-1 shadow-md">
                            <MapPin size={12} className="text-[#E07A5F]" />
                            {place.city}
                          </span>
                        )}

                        {/* Price Badge */}
                        {place?.price && (
                          <span className="absolute top-4 right-4 bg-gradient-to-r from-jaipur-dark to-[#994113] text-white text-xs font-bold px-3 py-1.5 rounded-full shadow-lg">
                            ₹{place.price}
                          </span>
                        )}

                        {/* Bottom Info on Image */}
                        <div className="absolute bottom-0 left-0 right-0 p-5">
                          <h3 className="font-serif font-bold text-xl text-white line-clamp-1 drop-shadow-md">
                            {place?.name}
                          </h3>
                        </div>
                      </div>

                      {/* Content */}
                      <div className="p-5">
                        <p className="text-sm text-slate-600 line-clamp-2 leading-relaxed min-h-[40px]">
                          {place?.description ||
                            "Discover the timeless beauty and royal heritage of this destination."}
                        </p>

                        <div className="mt-5 pt-4 border-t border-slate-100 flex items-center justify-between">
                          <span className="text-[#1A365D] font-bold text-sm flex items-center gap-1.5 group-hover:text-[#E07A5F] transition-colors">
                            Explore Now
                            <ArrowRight
                              size={16}
                              className="group-hover:translate-x-1 transition-transform"
                            />
                          </span>
                          <span className="text-[10px] uppercase tracking-widest font-bold text-[#E07A5F]/70">
                            View Details
                          </span>
                        </div>
                      </div>
                    </Link>
                  </motion.div>
                );
              })}
            </motion.div>
          )}

          {/* Bottom decorative line */}
          <motion.div
            initial={{ opacity: 0, scaleX: 0 }}
            whileInView={{ opacity: 1, scaleX: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 1, delay: 0.3 }}
            className="mt-12 h-[2px] w-full bg-gradient-to-r from-transparent via-[#E07A5F]/30 to-transparent origin-center"
          />
        </section>
        {/* ================= END PLACES SECTION ================= */}

        <Banners
          url="https://assets.cntraveller.in/photos/66a9ce9ba5fa5da03ea872ba/master/w_1600%2Cc_limit/GettyImages-1503371454.jpg"
          url2="https://www.world-unite.de/cache/thumbs/53641aa167837b9f5cad1aafec899ffc.jpg"
          text="Step onto a timeless balcony framed by intricate arches, and take in breathtaking views of the historic city below."
        />

        <Banners
          reverse={true}
          url="https://www.andbeyond.com/wp-content/uploads/sites/5/Amber-fort-jaipur-Rajasthan-India.jpg"
          url2="https://i.pinimg.com/736x/28/71/a5/2871a58198e0bb9bda1abb5a419c42e6.jpg"
          text="From glowing palace walls to ancient mountain peaks — these golden landmarks capture the royal soul and timeless beauty of Rajasthan."
        />

        <Banners
          url="https://www.ethnicrajasthan.com/cdn/shop/articles/thumbnail_IMG_4908.jpg?v=1567068228&width=2048"
          url2="https://www.bizevdeyokuz.com/wp-content/uploads/jaipur-hindistan-duygu.jpg"
          text="Step through majestic pink gateways and ornate marble arches to discover a world where royal history and breathtaking architecture meet."
        />

        <Banners
          reverse={true}
          url="https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcSGcOApDEmsmhqUe1DGhut0ydTlOAxxXt4Sog&s"
          url2="https://media.tacdn.com/media/attractions-splice-spp-674x446/06/71/c3/4a.jpg"
          text="The golden sandstone of Amer and the pink glow of the City Palace come alive, offering a breathtaking glimpse into timeless grandeur."
        />

        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
          variants={cascadeContainer}
          className="mt-24 mb-16 px-4 sm:px-6 md:px-10 lg:px-20 flex justify-start"
        >
          <div className="max-w-3xl text-left">
            <motion.p
              variants={fadeInUp}
              className="font-serif font-bold text-3xl sm:text-4xl md:text-5xl leading-tight text-[#1A365D]"
            >
              Discover the Royal Charm of Jaipur
            </motion.p>

            <motion.p
              variants={fadeInUp}
              className="mt-8 text-base sm:text-lg md:text-xl leading-[2] text-black/75"
            >
              Jaipur, famously known as the Pink City of India, is a mesmerizing
              blend of heritage, culture, architecture, and royal hospitality.
              Every fort, palace, and bustling bazaar tells stories of kings,
              warriors, and timeless traditions that continue to inspire
              travelers from around the world.
            </motion.p>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.96 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
          className="mt-20 bg-[#1A365D] p-6 md:p-10"
        >
          <Image
            src="/images/theJaipurCity.png"
            alt="Jaipur View"
            width={2000}
            height={300}
            className="w-full h-[220px] sm:h-[300px] md:h-[300px] object-cover rounded-[30px] shadow-2xl"
          />
        </motion.div>
      </section>
    </>
  );
}