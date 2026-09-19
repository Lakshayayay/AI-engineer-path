import { cache } from "react";
import { getMovie } from "@/lib/movies";

// generateMetadata and the page both need the film: one query per request.
export const movieById = cache(getMovie);
