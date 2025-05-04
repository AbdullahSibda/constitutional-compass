export async function getCorrection(text) {
  const myHeaders = new Headers();
  myHeaders.append("apikey", process.env.REACT_APP_DYMT_API_KEY);

  const requestOptions = {
    method: 'GET',
    redirect: 'follow',
    headers: myHeaders
  };

  try {
    const response = await fetch(
      `https://api.apilayer.com/dymt/did_you_mean_this?q=${encodeURIComponent(text)}`,
      requestOptions
    );

    if (!response.ok) {
      throw new Error(`Error ${response.status}: ${response.statusText}`);
    }

    const result = await response.json();
    
    // Handle the actual API response format
    return {
      corrected_text: result.result || text, // Use corrected version if available
      original_text: result.original_text || text,
      confidence: result.is_modified ? 0.95 : 0 // Convert boolean to confidence score
    };
  } catch (error) {
    console.error('DYMt API error:', error);
    throw new Error(`Failed to fetch correction: ${error.message}`);
  }
}