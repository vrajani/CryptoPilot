'use server';
/**
 * @fileOverview Analyzes the past week's price movements of BTC/ETH to detect potential dips for buying opportunities.
 *
 * - analyzePastWeekPriceMovement - A function that handles the price movement analysis.
 * - AnalyzePastWeekPriceMovementInput - The input type for the analyzePastWeekPriceMovement function.
 * - AnalyzePastWeekPriceMovementOutput - The return type for the analyzePastWeekPriceMovement function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const AnalyzePastWeekPriceMovementInputSchema = z.object({
  btcPrices: z.array(z.number()).describe('An array of BTC prices from the past week.'),
  ethPrices: z.array(z.number()).describe('An array of ETH prices from the past week.'),
  currentBtcPrice: z.number().describe('The current price of BTC.'),
  currentEthPrice: z.number().describe('The current price of ETH.'),
});
export type AnalyzePastWeekPriceMovementInput = z.infer<typeof AnalyzePastWeekPriceMovementInputSchema>;

const AnalyzePastWeekPriceMovementOutputSchema = z.object({
  btcDipScore: z.number().describe('A score indicating the potential dip for BTC (0-100). Higher score indicates a better dip opportunity.'),
  ethDipScore: z.number().describe('A score indicating the potential dip for ETH (0-100). Higher score indicates a better dip opportunity.'),
  recommendation: z.string().describe('A recommendation on whether to buy BTC, ETH, or neither, including suggested allocation percentages if buying is recommended.'),
});
export type AnalyzePastWeekPriceMovementOutput = z.infer<typeof AnalyzePastWeekPriceMovementOutputSchema>;

export async function analyzePastWeekPriceMovement(input: AnalyzePastWeekPriceMovementInput): Promise<AnalyzePastWeekPriceMovementOutput> {
  return analyzePastWeekPriceMovementFlow(input);
}

const prompt = ai.definePrompt({
  name: 'analyzePastWeekPriceMovementPrompt',
  input: {schema: AnalyzePastWeekPriceMovementInputSchema},
  output: {schema: AnalyzePastWeekPriceMovementOutputSchema},
  prompt: `You are a cryptocurrency trading expert. Analyze the provided BTC and ETH price data from the past week, along with their current prices, to identify potential dip buying opportunities.

  Consider the historical price movements to determine if the current prices represent a significant dip compared to the recent past.  Calculate a "dip score" for both BTC and ETH, ranging from 0 to 100, where higher scores indicate a more favorable dip opportunity.

  Provide a recommendation on whether to buy BTC, ETH, or neither. If buying is recommended, suggest allocation percentages between BTC and ETH.

  Past Week BTC Prices: {{{btcPrices}}}
Current BTC Price: {{{currentBtcPrice}}}

Past Week ETH Prices: {{{ethPrices}}}
Current ETH Price: {{{currentEthPrice}}}

  Based on this data, provide the btcDipScore, ethDipScore, and recommendation in JSON format:
  {{output schema=AnalyzePastWeekPriceMovementOutputSchema}}
`,
});

const analyzePastWeekPriceMovementFlow = ai.defineFlow(
  {
    name: 'analyzePastWeekPriceMovementFlow',
    inputSchema: AnalyzePastWeekPriceMovementInputSchema,
    outputSchema: AnalyzePastWeekPriceMovementOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
