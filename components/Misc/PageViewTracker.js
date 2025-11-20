"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { supabase } from "../../lib/supabase";

const PageViewTracker = () => {
  const router = useRouter();
  const [lastHourViews, setLastHourViews] = useState(0);

  useEffect(() => {
    const captureReferrer = () => {
      const referrer = document.referrer;

      if (referrer && !localStorage.getItem("referrer")) {
        localStorage.setItem("referrer", referrer); // Store referrer in local storage
      }
    };

    captureReferrer();
  }, []);

  useEffect(() => {
    const handlePageView = async (url) => {
      if (!url) return;

      try {
        // Check if the page already exists in the database
        const { data, error } = await supabase
          .from("page_views")
          .select("id, view_count")
          .eq("page_url", url)
          .single();

        if (error && error.code === "PGRST116") {
          // Insert a new record if it doesn't exist
          const { error: insertError } = await supabase
            .from("page_views")
            .insert({ page_url: url, view_count: 1, last_viewed: new Date().toISOString() });

          if (insertError) {
            console.error("Error inserting new page view record:", insertError);
          }
        } else if (data) {
          // Increment the view count and update the last_viewed timestamp for an existing record
          const { error: updateError } = await supabase
            .from("page_views")
            .update({
              view_count: data.view_count + 1,
              last_viewed: new Date().toISOString(),
            })
            .eq("id", data.id);

          if (updateError) {
            console.error("Error updating page view record:", updateError);
          }
        }
      } catch (err) {
        console.error("Unexpected error in handlePageView:", err);
      }
    };

    const fetchLastHourViews = async () => {
      const oneHourAgo = new Date();
      oneHourAgo.setHours(oneHourAgo.getHours() - 1);

      try {
        const { data, error } = await supabase
          .from("page_views")
          .select("view_count")
          .gte("last_viewed", oneHourAgo.toISOString());

        if (error) {
          console.error("Error fetching last hour views:", error);
        } else {
          const totalViews = data.reduce((sum, page) => sum + page.view_count, 0);
          setLastHourViews(totalViews);
        }
      } catch (err) {
        console.error("Unexpected error in fetchLastHourViews:", err);
      }
    };

    // Track initial page view
    handlePageView(router.asPath);

    // Fetch last hour views on component mount
    fetchLastHourViews();

    // Listen for route changes and track page views
    const handleRouteChange = (url) => {
      handlePageView(url);
      fetchLastHourViews(); // Update last hour views on route change
    };
    router.events.on("routeChangeComplete", handleRouteChange);

    // Cleanup listener on unmount
    return () => {
      router.events.off("routeChangeComplete", handleRouteChange);
    };
  }, [router]);


};

export default PageViewTracker;