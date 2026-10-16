"use client";
import { useState, useMemo } from "react";
import { useDispatch } from "react-redux";
import { motion, AnimatePresence } from "framer-motion";
import CounterBtn from "../../../ui/CounterBtn";
import { setTickets, setTotalAmount } from "@/store/slices/bookingSlice";
import { usePlace } from "@/hooks/useCurrentPlace";
import { useTicketTypes } from "@/hooks/useTicketType";
import FullPageLoader from "@/components/ui/FullPageLoader"; 

export default function TicketCounter({
    tickets,
    onNext,
    onBack,
    ticketTypeIds,
}) {
    const dispatch = useDispatch();
    const { currentPlace, placeId } = usePlace();
    const {
        data: ticketTypes = [],
        isLoading,
        isError,
        refetch,
    } = useTicketTypes(placeId);
    const selectedTypeIds = ticketTypeIds ? new Set(ticketTypeIds) : null;
    const availableTicketTypes = ticketTypes.filter((ticketType) => {
        const ticketTypeId = ticketType._id || ticketType.id;
        return ticketType.isAvailable !== false &&
            (!selectedTypeIds || selectedTypeIds.has(ticketTypeId));
    });
    const [counts, setCounts] = useState(tickets || {});
    const selectedCounts = Object.keys(counts).length
        ? counts
        : Object.fromEntries(availableTicketTypes.map((ticketType) => [ticketType._id || ticketType.id, 0]));

    const updateCount = (id, value) => {
        setCounts((prev) => {
            const currentCount = prev[id] || 0;
            const newCount = currentCount + value;
            if (newCount >= 0) {
                return { ...prev, [id]: newCount };
            }
            return prev;
        });
    };

    const total = useMemo(() => {
        return availableTicketTypes.reduce((acc, t) => {
            const key = t._id || t.id;
            const priceWithTax = Math.round(
                Number(t.price) * (1 + Number(t.taxPercent || 0) / 100) * 100
            ) / 100;
            return acc + ((selectedCounts[key] || 0) * priceWithTax);
        }, 0);
    }, [availableTicketTypes, selectedCounts]);

    const hasSelectedTickets = Object.values(selectedCounts).some((count) => count > 0);

    const handleContinue = () => {
        if (!hasSelectedTickets) return;
        dispatch(setTickets(counts));
        dispatch(setTotalAmount(total));
        onNext();
    };

    return (
        <> 
            <AnimatePresence mode="wait">
                {isLoading && <FullPageLoader message="Loading Tickets Deaitls..." />}
            </AnimatePresence>

            <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }}
                className="w-full space-y-5"
            >
                <div className="relative">
                    <h2 className="text-2xl font-semibold sm:text-3xl font-serif font-normal text-royal-blue leading-tight">Select the number of visitors</h2>
                    {currentPlace?.name && (
                        <p className="mt-2 text-sm font-medium text-royal-blue/70">
                            Tickets for {currentPlace.name}
                        </p>
                    )}
                    <div className="h-[1px] w-12 bg-gold/40 mt-2" />
                </div>

                <div className="w-full space-y-2.5 rounded-xl border border-dashed border-gold/15 p-2 bg-sandstone/10">
                    {isError ? (
                        <div className="rounded-lg bg-red-50 p-4 text-sm text-red-700">
                            <p>Tickets for this venue could not be loaded.</p>
                            <button
                                type="button"
                                onClick={() => refetch()}
                                className="mt-2 font-semibold underline"
                            >
                                Try again
                            </button>
                        </div>
                    ) : !isLoading && availableTicketTypes.length === 0 ? (
                        <p className="rounded-lg bg-white p-4 text-sm text-slate-600">
                            No available tickets are configured for this venue.
                        </p>
                    ) : !isLoading && availableTicketTypes.map((t, index) => {
                        const uniqueKey = t._id || t.id || index;
                        const isSelected = (selectedCounts[uniqueKey] || 0) > 0;
                        return (
                            <motion.div
                                key={uniqueKey}
                                className={`flex flex-col sm:flex-row justify-between items-start sm:items-center p-4 rounded-xl transition-all duration-300 border text-left select-none sm:w-full gap-2
                                    ${isSelected
                                        ? "border-gold bg-gradient-to-br from-royal-blue to-[#112952] text-white shadow-lg"
                                        : "border-gold/15 bg-white hover:border-gold/40 text-royal-blue"
                                    }`}
                            >
                                <div className="mb-3 sm:mb-0 space-y-0.5 flex-1">
                                    <p className={`font-serif font-bold text-base tracking-wide ${isSelected ? "text-gold" : "text-royal-blue"}`}>
                                        {t.center ? `${t.center} · ${t.name}` : t.name}
                                    </p>
                                </div>

                                <div className="flex items-center justify-between w-full sm:w-auto gap-4 sm:gap-6 shrink-0">
                                    <p className={`font-serif text-xl font-bold tracking-wide ${isSelected ? "text-gold drop-shadow-sm" : "text-royal-blue"}`}>
                                        {Number(t.price) === 0 ? "Free" : `₹${(
                                            Math.round(
                                                Number(t.price) *
                                                (1 + Number(t.taxPercent || 0) / 100) *
                                                100
                                            ) / 100
                                        ).toFixed(2)}`}
                                    </p>
                                    {Number(t.taxPercent) > 0 && (
                                        <p className={`text-[10px] ${isSelected ? "text-white/60" : "text-slate-500"}`}>
                                            incl. {t.taxPercent}% GST
                                        </p>
                                    )}

                                    <div className={`flex items-center gap-3 px-2 py-1.5 rounded-lg border transition-colors duration-300
                                        ${isSelected
                                            ? "bg-white/10 border-white/20"
                                            : "bg-sandstone/80 border-gold/15"
                                        }`}
                                    >
                                        <CounterBtn
                                            text="-"
                                            onClick={() => updateCount(uniqueKey, -1)}
                                            disabled={(selectedCounts[uniqueKey] || 0) <= 0}
                                        />
                                        <div className={`w-8 text-center font-bold font-serif text-xl ${isSelected ? "text-white" : "text-royal-blue"}`}>
                                            {selectedCounts[uniqueKey] || 0}
                                        </div>
                                        <CounterBtn
                                            text="+"
                                            onClick={() => updateCount(uniqueKey, 1)}
                                        />
                                    </div>
                                </div>
                            </motion.div>
                        );
                    })}
                </div>

                <div className="p-4 rounded-xl bg-gradient-to-r from-royal-blue to-[#0b2149] text-white shadow-xl relative overflow-hidden border border-gold/20">
                    <div className="absolute inset-0 opacity-[0.06] bg-mandala pointer-events-none scale-120"></div>
                    <div className="relative z-10 flex justify-between items-center">
                        <div className="space-y-0.5">
                            <p className="text-[9px] tracking-[3px] text-gold font-bold uppercase font-sans">Total Payable Amount</p>
                            <motion.h3 key={total} initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="text-2xl sm:text-3xl font-serif font-semibold text-white tracking-wide">₹{total.toFixed(2)}</motion.h3>
                        </div>
                        <div className="text-2xl filter drop-shadow-md select-none">🎟️</div>
                    </div>
                </div>

                <div className="flex justify-between items-center pt-2 gap-4 mb-5">
                    <button onClick={onBack} className="flex-1 py-3.5 font-bold font-serif text-xs text-jaipur-dark hover:text-royal-blue transition-colors uppercase tracking-[2px]">← Back</button>
                    <button disabled={!hasSelectedTickets} onClick={handleContinue} className={`flex-[2] py-3.5 rounded-xl font-serif text-xs font-bold tracking-[3px] transition-all duration-300 uppercase border ${!hasSelectedTickets ? "bg-sandstone/50 text-gray-400 cursor-not-allowed border-gray-200/60" : "bg-gradient-to-r from-jaipur-dark to-[#994113] text-white border-gold/30 cursor-pointer shadow-md shadow-jaipur-dark/10"}`}>CONTINUE ⟶</button>
                </div>
            </motion.div>
        </>
    );
}