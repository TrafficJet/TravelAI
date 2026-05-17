// Export all Claude tool definitions and executors from a single entry point

export { searchFlightsTool, executeSearchFlights } from './searchFlights.tool';
export type { SearchFlightsInput } from './searchFlights.tool';

export { searchHotelsTool, executeSearchHotels } from './searchHotels.tool';
export type { SearchHotelsInput } from './searchHotels.tool';

export { createBookingTool, executeCreateBooking } from './createBooking.tool';
export type { CreateBookingInput } from './createBooking.tool';

export { getWalletBalanceTool, executeGetWalletBalance } from './getWalletBalance.tool';

export { getBookingStatusTool, executeGetBookingStatus } from './getBookingStatus.tool';
export type { GetBookingStatusInput } from './getBookingStatus.tool';

export { searchTransfersTool, executeSearchTransfers } from './searchTransfers.tool';
export type { TransferOption, SearchTransfersInput } from './searchTransfers.tool';

export { checkJourneyTimingTool, executeCheckJourneyTiming } from './checkJourneyTiming.tool';
export type { JourneyTimingResult, CheckJourneyTimingInput } from './checkJourneyTiming.tool';

export { searchActivitiesTool, executeSearchActivities } from './searchActivities.tool';
export type { Activity, SearchActivitiesInput } from './searchActivities.tool';

import { searchFlightsTool } from './searchFlights.tool';
import { searchHotelsTool } from './searchHotels.tool';
import { createBookingTool } from './createBooking.tool';
import { getWalletBalanceTool } from './getWalletBalance.tool';
import { getBookingStatusTool } from './getBookingStatus.tool';
import { searchTransfersTool } from './searchTransfers.tool';
import { checkJourneyTimingTool } from './checkJourneyTiming.tool';
import { searchActivitiesTool } from './searchActivities.tool';

// All tools array — pass directly to Anthropic API
export const ALL_TOOLS = [
  searchFlightsTool,
  searchHotelsTool,
  createBookingTool,
  getWalletBalanceTool,
  getBookingStatusTool,
  searchTransfersTool,
  checkJourneyTimingTool,
  searchActivitiesTool,
];
