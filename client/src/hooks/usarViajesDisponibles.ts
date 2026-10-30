import { useMemo } from "react";
import { Trip } from "../shared/types";
import { TripStatus } from "../shared/constants";


const useAvailableTrips = (trips: Trip[]) => {
  return useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return trips.filter(trip => {
      const status = (trip.status || "").toLowerCase();
      const tripDate = new Date(`${trip.date.slice(0, 10)}T00:00:00`);
      return status === TripStatus.PROGRAMADO.toLowerCase() && tripDate >= today;
    });
  }, [trips]);
};

export default useAvailableTrips;
