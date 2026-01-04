import { useState, useEffect } from "react";
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    Alert,
} from "react-native";
import { StatusBar } from "expo-status-bar";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import {
    ArrowLeft,
    Sparkles,
    TrendingUp,
    Heart,
    AlertCircle,
    Lightbulb,
    Target,
    Download,
    Share2,
    Users,
} from "lucide-react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { careerClusters, domains } from "./assessmentData";

export default function ReportScreen() {
    const insets = useSafeAreaInsets();
    const router = useRouter();

    const [viewMode, setViewMode] = useState("teen"); // "teen" or "parent"
    const [reportData, setReportData] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        generateReport();
    }, []);

    const generateReport = async () => {
        try {
            const resultsData = await AsyncStorage.getItem("teenAssessmentResults");
            const profileData = await AsyncStorage.getItem("teenAssessmentProfile");

            if (!resultsData || !profileData) {
                Alert.alert("Error", "No assessment data found");
                router.back();
                return;
            }

            const results = JSON.parse(resultsData);
            const profile = JSON.parse(profileData);

            // Aggregate scores across all modules
            const aggregatedScores = {
                A: { interest: 0, strength: 0, skill: 0, comfort: 0 },
                C: { interest: 0, strength: 0, skill: 0, comfort: 0 },
                S: { interest: 0, strength: 0, skill: 0, comfort: 0 },
                P: { interest: 0, strength: 0, skill: 0, comfort: 0 },
            };

            // Module A: Interest scores
            if (results.A) {
                Object.keys(results.A.scores).forEach((domain) => {
                    aggregatedScores[domain].interest = results.A.scores[domain];
                });
            }

            // Module B: Strength scores
            if (results.B) {
                Object.keys(results.B.scores).forEach((domain) => {
                    aggregatedScores[domain].strength = results.B.scores[domain];
                });
            }

            // Module C: Skill scores
            if (results.C) {
                Object.keys(results.C.scores).forEach((domain) => {
                    aggregatedScores[domain].skill = results.C.scores[domain];
                });
            }

            // Module D: Comfort scores
            if (results.D) {
                Object.keys(results.D.scores).forEach((domain) => {
                    aggregatedScores[domain].comfort = results.D.scores[domain];
                });
            }

            // Identify primary domains
            const domainTotals = {};
            Object.keys(aggregatedScores).forEach((domain) => {
                domainTotals[domain] =
                    aggregatedScores[domain].interest +
                    aggregatedScores[domain].strength +
                    aggregatedScores[domain].skill;
            });

            const sortedDomains = Object.keys(domainTotals).sort(
                (a, b) => domainTotals[b] - domainTotals[a]
            );

            // Determine eligible career clusters
            const eligibleClusters = [];

            Object.keys(careerClusters).forEach((clusterId) => {
                const cluster = careerClusters[clusterId];
                const primaryDomain = cluster.domains[0];
                const scores = aggregatedScores[primaryDomain];

                // Eligibility criteria
                if (scores.interest >= 6 && scores.strength >= 5 && scores.comfort >= 5) {
                    // Determine skill level
                    let skillLevel = "explore";
                    if (scores.skill >= 8) skillLevel = "advanced";
                    else if (scores.skill >= 5) skillLevel = "develop";

                    eligibleClusters.push({
                        ...cluster,
                        id: clusterId,
                        skillLevel,
                        opportunities: cluster.careers[skillLevel],
                    });
                }
            });

            // Limit to max 2 clusters
            const selectedClusters = eligibleClusters.slice(0, 2);

            // Identify burnout risks
            const burnoutRisks = [];
            Object.keys(aggregatedScores).forEach((domain) => {
                const s = aggregatedScores[domain];
                if (s.strength >= 6 && s.comfort <= 3) {
                    burnoutRisks.push({
                        domain,
                        domainName: domains[domain],
                        strength: s.strength,
                        comfort: s.comfort,
                    });
                }
            });

            // Generate insights
            const primaryDomain = sortedDomains[0];
            const secondaryDomain = sortedDomains[1];

            const report = {
                profile,
                scores: aggregatedScores,
                primaryDomain,
                secondaryDomain,
                sortedDomains,
                clusters: selectedClusters,
                burnoutRisks,
                generatedAt: new Date().toISOString(),
            };

            setReportData(report);
            setLoading(false);
        } catch (error) {
            console.error("Error generating report:", error);
            Alert.alert("Error", "Failed to generate report");
            setLoading(false);
        }
    };

    if (loading || !reportData) {
        return (
            <View style={styles.container}>
                <StatusBar style="light" />
                <View style={styles.loadingContainer}>
                    <Sparkles size={48} color="#FF6B6B" strokeWidth={1.5} />
                    <Text style={styles.loadingText}>Generating your report...</Text>
                </View>
            </View>
        );
    }

    const DomainScoreCard = ({ domain, domainName, scores }) => (
        <View style={styles.domainScoreCard}>
            <Text style={styles.domainName}>{domainName}</Text>
            <View style={styles.scoreRow}>
                <View style={styles.scoreItem}>
                    <Text style={styles.scoreLabel}>Interest</Text>
                    <Text style={styles.scoreValue}>{scores.interest.toFixed(1)}</Text>
                </View>
                <View style={styles.scoreItem}>
                    <Text style={styles.scoreLabel}>Strength</Text>
                    <Text style={styles.scoreValue}>{scores.strength.toFixed(1)}</Text>
                </View>
                <View style={styles.scoreItem}>
                    <Text style={styles.scoreLabel}>Skill</Text>
                    <Text style={styles.scoreValue}>{scores.skill.toFixed(1)}</Text>
                </View>
                <View style={styles.scoreItem}>
                    <Text style={styles.scoreLabel}>Comfort</Text>
                    <Text style={styles.scoreValue}>{scores.comfort.toFixed(1)}</Text>
                </View>
            </View>
        </View>
    );

    return (
        <View style={styles.container}>
            <StatusBar style="light" />

            {/* Header */}
            <LinearGradient
                colors={["#8B5CF6", "#7C3AED", "#6D28D9"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={[styles.header, { paddingTop: insets.top + 12 }]}
            >
                <View style={styles.headerTop}>
                    <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
                        <ArrowLeft size={24} color="#FFFFFF" strokeWidth={2.5} />
                    </TouchableOpacity>
                    <View style={styles.headerInfo}>
                        <Text style={styles.headerTitle}>Your Report</Text>
                    </View>
                    <View style={{ width: 40 }} />
                </View>

                {/* Toggle View Mode */}
                <View style={styles.toggleContainer}>
                    <TouchableOpacity
                        style={[
                            styles.toggleButton,
                            viewMode === "teen" && styles.toggleButtonActive,
                        ]}
                        onPress={() => setViewMode("teen")}
                    >
                        <Sparkles
                            size={18}
                            color={viewMode === "teen" ? "#8B5CF6" : "#9CA3AF"}
                            strokeWidth={2}
                        />
                        <Text
                            style={[
                                styles.toggleText,
                                viewMode === "teen" && styles.toggleTextActive,
                            ]}
                        >
                            For You
                        </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[
                            styles.toggleButton,
                            viewMode === "parent" && styles.toggleButtonActive,
                        ]}
                        onPress={() => setViewMode("parent")}
                    >
                        <Users
                            size={18}
                            color={viewMode === "parent" ? "#8B5CF6" : "#9CA3AF"}
                            strokeWidth={2}
                        />
                        <Text
                            style={[
                                styles.toggleText,
                                viewMode === "parent" && styles.toggleTextActive,
                            ]}
                        >
                            For Parents
                        </Text>
                    </TouchableOpacity>
                </View>
            </LinearGradient>

            {/* Report Content */}
            <ScrollView
                style={styles.scrollView}
                contentContainerStyle={[
                    styles.scrollContent,
                    { paddingBottom: insets.bottom + 140 },
                ]}
                showsVerticalScrollIndicator={false}
            >
                {viewMode === "teen" ? (
                    // TEEN REPORT
                    <>
                        {/* Introduction */}
                        <View style={styles.sectionCard}>
                            <View style={styles.sectionHeader}>
                                <Sparkles size={24} color="#8B5CF6" strokeWidth={2} />
                                <Text style={styles.sectionTitle}>Your Unique Profile</Text>
                            </View>
                            <Text style={styles.bodyText}>
                                You've completed a journey of self-discovery! This report isn't about
                                labeling you or deciding your future. It's about understanding what
                                makes you unique and exploring paths that align with who you are.
                            </Text>
                        </View>

                        {/* How Your Brain Works */}
                        <View style={styles.sectionCard}>
                            <View style={styles.sectionHeader}>
                                <Heart size={24} color="#FF6B6B" strokeWidth={2} />
                                <Text style={styles.sectionTitle}>How Your Brain Naturally Works</Text>
                            </View>
                            <Text style={styles.bodyText}>
                                You're naturally drawn to{" "}
                                <Text style={styles.boldText}>
                                    {domains[reportData.primaryDomain]}
                                </Text>{" "}
                                activities. This means your brain lights up when you engage in tasks
                                that involve this type of thinking.
                            </Text>

                            {reportData.secondaryDomain && (
                                <Text style={styles.bodyText}>
                                    You also show strength in{" "}
                                    <Text style={styles.boldText}>
                                        {domains[reportData.secondaryDomain]}
                                    </Text>{" "}
                                    thinking, which makes you versatile!
                                </Text>
                            )}
                        </View>

                        {/* What Gives You Energy */}
                        <View style={styles.sectionCard}>
                            <View style={styles.sectionHeader}>
                                <TrendingUp size={24} color="#10B981" strokeWidth={2} />
                                <Text style={styles.sectionTitle}>What Gives You Energy</Text>
                            </View>

                            {reportData.scores[reportData.primaryDomain].interest >= 7 && (
                                <View style={styles.insightBox}>
                                    <Text style={styles.insightText}>
                                        ✨ You have a <Text style={styles.boldText}>strong natural pull</Text>{" "}
                                        toward {domains[reportData.primaryDomain].toLowerCase()} activities
                                    </Text>
                                </View>
                            )}

                            {reportData.scores[reportData.primaryDomain].skill <= 5 &&
                                reportData.scores[reportData.primaryDomain].interest >= 7 && (
                                    <View style={styles.insightBox}>
                                        <Text style={styles.insightText}>
                                            🌱 You have amazing <Text style={styles.boldText}>growth potential</Text>{" "}
                                            here - your interest is high and you're just getting started with the skills!
                                        </Text>
                                    </View>
                                )}
                        </View>

                        {/* What Feels Draining */}
                        {reportData.burnoutRisks.length > 0 && (
                            <View style={styles.sectionCard}>
                                <View style={styles.sectionHeader}>
                                    <AlertCircle size={24} color="#F59E0B" strokeWidth={2} />
                                    <Text style={styles.sectionTitle}>What Feels Draining (For Now)</Text>
                                </View>
                                <Text style={styles.bodyText}>
                                    Even though you're good at some things, they might feel stressful
                                    right now:
                                </Text>
                                {reportData.burnoutRisks.map((risk, index) => (
                                    <View key={index} style={styles.warningBox}>
                                        <AlertCircle size={18} color="#F59E0B" strokeWidth={2} />
                                        <Text style={styles.warningText}>
                                            <Text style={styles.boldText}>{risk.domainName}</Text>: You're
                                            capable, but it might stress you out. Take breaks and don't
                                            push too hard here.
                                        </Text>
                                    </View>
                                ))}
                            </View>
                        )}

                        {/* Best Growth Zone */}
                        {reportData.clusters.length > 0 && (
                            <View style={styles.sectionCard}>
                                <View style={styles.sectionHeader}>
                                    <Target size={24} color="#8B5CF6" strokeWidth={2} />
                                    <Text style={styles.sectionTitle}>Your Best Growth Zones</Text>
                                </View>
                                <Text style={styles.bodyText}>
                                    Based on your profile, here are areas where you can explore and grow:
                                </Text>

                                {reportData.clusters.map((cluster, index) => (
                                    <View key={index} style={styles.clusterCard}>
                                        <View style={styles.clusterHeader}>
                                            <Text style={styles.clusterName}>{cluster.name}</Text>
                                            <View style={styles.skillBadge}>
                                                <Text style={styles.skillBadgeText}>
                                                    {cluster.skillLevel === "explore"
                                                        ? "Explore"
                                                        : cluster.skillLevel === "develop"
                                                            ? "Develop"
                                                            : "Advanced"}
                                                </Text>
                                            </View>
                                        </View>
                                        <Text style={styles.clusterDescription}>{cluster.description}</Text>
                                    </View>
                                ))}
                            </View>
                        )}

                        {/* Safe Things to Try */}
                        {reportData.clusters.length > 0 && (
                            <View style={styles.sectionCard}>
                                <View style={styles.sectionHeader}>
                                    <Lightbulb size={24} color="#FF6B6B" strokeWidth={2} />
                                    <Text style={styles.sectionTitle}>Safe Things to Try Next</Text>
                                </View>
                                <Text style={styles.disclaimerText}>
                                    💡 These are exploration options, not final careers
                                </Text>

                                {reportData.clusters.map((cluster, index) => (
                                    <View key={index} style={styles.opportunitiesSection}>
                                        <Text style={styles.opportunitiesTitle}>{cluster.name}</Text>
                                        {cluster.opportunities.slice(0, 5).map((opportunity, i) => (
                                            <View key={i} style={styles.opportunityItem}>
                                                <View style={styles.opportunityDot} />
                                                <Text style={styles.opportunityText}>{opportunity}</Text>
                                            </View>
                                        ))}
                                    </View>
                                ))}
                            </View>
                        )}
                    </>
                ) : (
                    // PARENT REPORT
                    <>
                        {/* Summary Snapshot */}
                        <View style={styles.sectionCard}>
                            <View style={styles.sectionHeader}>
                                <Users size={24} color="#8B5CF6" strokeWidth={2} />
                                <Text style={styles.sectionTitle}>Summary Snapshot</Text>
                            </View>
                            <View style={styles.disclaimerBox}>
                                <AlertCircle size={20} color="#DC2626" strokeWidth={2} />
                                <Text style={styles.disclaimerBoldText}>
                                    This is NOT a medical or psychological diagnosis
                                </Text>
                            </View>
                            <Text style={styles.bodyText}>
                                Your teen shows primary strength in{" "}
                                <Text style={styles.boldText}>
                                    {domains[reportData.primaryDomain]}
                                </Text>{" "}
                                thinking, with secondary ability in{" "}
                                <Text style={styles.boldText}>
                                    {domains[reportData.secondaryDomain]}
                                </Text>.
                            </Text>
                        </View>

                        {/* Detailed Scores */}
                        <View style={styles.sectionCard}>
                            <View style={styles.sectionHeader}>
                                <TrendingUp size={24} color="#10B981" strokeWidth={2} />
                                <Text style={styles.sectionTitle}>Strength vs Interest Breakdown</Text>
                            </View>
                            <Text style={styles.bodyText}>
                                Understanding these four dimensions helps you support your teen's growth:
                            </Text>
                            {reportData.sortedDomains.map((domain) => (
                                <DomainScoreCard
                                    key={domain}
                                    domain={domain}
                                    domainName={domains[domain]}
                                    scores={reportData.scores[domain]}
                                />
                            ))}
                        </View>

                        {/* Burnout Risk Warnings */}
                        {reportData.burnoutRisks.length > 0 && (
                            <View style={styles.sectionCard}>
                                <View style={styles.sectionHeader}>
                                    <AlertCircle size={24} color="#DC2626" strokeWidth={2} />
                                    <Text style={styles.sectionTitle}>⚠️ Burnout Risk Warnings</Text>
                                </View>
                                <Text style={styles.bodyText}>
                                    Your teen shows high ability but low comfort in these areas. This is
                                    a burnout risk signal.
                                </Text>
                                {reportData.burnoutRisks.map((risk, index) => (
                                    <View key={index} style={styles.warningBox}>
                                        <AlertCircle size={18} color="#DC2626" strokeWidth={2} />
                                        <Text style={styles.warningText}>
                                            <Text style={styles.boldText}>{risk.domainName}</Text>: High
                                            strength ({risk.strength.toFixed(1)}) but low comfort (
                                            {risk.comfort.toFixed(1)}). Avoid over-pushing in this area.
                                        </Text>
                                    </View>
                                ))}
                            </View>
                        )}

                        {/* Career Clusters */}
                        {reportData.clusters.length > 0 && (
                            <View style={styles.sectionCard}>
                                <View style={styles.sectionHeader}>
                                    <Target size={24} color="#8B5CF6" strokeWidth={2} />
                                    <Text style={styles.sectionTitle}>Career Clusters Explained</Text>
                                </View>
                                {reportData.clusters.map((cluster, index) => (
                                    <View key={index} style={styles.parentClusterCard}>
                                        <Text style={styles.parentClusterName}>{cluster.name}</Text>
                                        <Text style={styles.parentClusterDesc}>{cluster.description}</Text>
                                        <Text style={styles.parentSkillLevel}>
                                            Current Level: <Text style={styles.boldText}>{cluster.skillLevel}</Text>
                                        </Text>
                                        <Text style={styles.parentOpportunitiesTitle}>
                                            Recommended exploration:
                                        </Text>
                                        {cluster.opportunities.slice(0, 3).map((opp, i) => (
                                            <Text key={i} style={styles.parentOpportunityText}>
                                                • {opp}
                                            </Text>
                                        ))}
                                    </View>
                                ))}
                            </View>
                        )}

                        {/* How Parents Should Support */}
                        <View style={styles.sectionCard}>
                            <View style={styles.sectionHeader}>
                                <Heart size={24} color="#10B981" strokeWidth={2} />
                                <Text style={styles.sectionTitle}>How to Support Your Teen</Text>
                            </View>
                            <View style={styles.supportItem}>
                                <Text style={styles.supportTitle}>✅ DO:</Text>
                                <Text style={styles.supportText}>
                                    • Encourage exploration without pressure{"\n"}
                                    • Celebrate small wins in their interest areas{"\n"}
                                    • Respect their natural pace and comfort zones{"\n"}
                                    • Ask open-ended questions about what excites them
                                </Text>
                            </View>
                            <View style={styles.supportItem}>
                                <Text style={styles.supportTitle}>❌ AVOID:</Text>
                                <Text style={styles.supportText}>
                                    • Forcing them into "practical" paths they resist{"\n"}
                                    • Comparing them to others{"\n"}
                                    • Dismissing low-skill areas—they can grow!{"\n"}
                                    • Over-scheduling or pushing burnout-risk areas
                                </Text>
                            </View>
                        </View>

                        {/* Development Timeline */}
                        <View style={styles.sectionCard}>
                            <View style={styles.sectionHeader}>
                                <TrendingUp size={24} color="#F59E0B" strokeWidth={2} />
                                <Text style={styles.sectionTitle}>Development Timeline</Text>
                            </View>
                            <Text style={styles.bodyText}>
                                <Text style={styles.boldText}>Ages 13-15</Text>: Exploration phase. Let them
                                try many things without commitment.{"\n\n"}
                                <Text style={styles.boldText}>Ages 16-17</Text>: Skill-building phase. Support
                                deeper practice in 1-2 areas of strong interest.{"\n\n"}
                                <Text style={styles.boldText}>Ages 18-19</Text>: Direction phase. Help refine
                                choices based on learned experience.
                            </Text>
                        </View>
                    </>
                )}

                {/* Action Buttons */}
                <View style={styles.actionButtons}>
                    <TouchableOpacity style={styles.actionButton}>
                        <Download size={20} color="#8B5CF6" strokeWidth={2} />
                        <Text style={styles.actionButtonText}>Download PDF</Text>
                    </TouchableOpacity>
                    {reportData.profile.parentEmail && (
                        <TouchableOpacity style={styles.actionButton}>
                            <Share2 size={20} color="#8B5CF6" strokeWidth={2} />
                            <Text style={styles.actionButtonText}>Email Report</Text>
                        </TouchableOpacity>
                    )}
                </View>
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: "#F8F9FA",
    },
    loadingContainer: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        gap: 16,
    },
    loadingText: {
        fontSize: 16,
        fontWeight: "600",
        color: "#6B7280",
    },
    header: {
        paddingBottom: 20,
        shadowColor: "#8B5CF6",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
        elevation: 8,
    },
    headerTop: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        paddingHorizontal: 16,
        marginBottom: 16,
    },
    backButton: {
        width: 40,
        height: 40,
        borderRadius: 12,
        backgroundColor: "rgba(255, 255, 255, 0.18)",
        justifyContent: "center",
        alignItems: "center",
        borderWidth: 1,
        borderColor: "rgba(255, 255, 255, 0.25)",
    },
    headerInfo: {
        flex: 1,
        alignItems: "center",
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: "700",
        color: "#FFFFFF",
        letterSpacing: -0.3,
    },
    toggleContainer: {
        flexDirection: "row",
        marginHorizontal: 20,
        backgroundColor: "rgba(255, 255, 255, 0.15)",
        borderRadius: 14,
        padding: 4,
        gap: 4,
    },
    toggleButton: {
        flex: 1,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        paddingVertical: 10,
        borderRadius: 10,
        gap: 8,
    },
    toggleButtonActive: {
        backgroundColor: "#FFFFFF",
    },
    toggleText: {
        fontSize: 14,
        fontWeight: "600",
        color: "#9CA3AF",
    },
    toggleTextActive: {
        color: "#8B5CF6",
        fontWeight: "700",
    },
    scrollView: {
        flex: 1,
    },
    scrollContent: {
        paddingTop: 24,
        paddingHorizontal: 20,
    },
    sectionCard: {
        backgroundColor: "#FFFFFF",
        borderRadius: 20,
        padding: 24,
        marginBottom: 20,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.08,
        shadowRadius: 12,
        elevation: 4,
    },
    sectionHeader: {
        flexDirection: "row",
        alignItems: "center",
        marginBottom: 16,
        gap: 12,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: "700",
        color: "#1F2937",
        flex: 1,
    },
    bodyText: {
        fontSize: 15,
        color: "#374151",
        lineHeight: 24,
        marginBottom: 12,
    },
    boldText: {
        fontWeight: "700",
        color: "#1F2937",
    },
    insightBox: {
        backgroundColor: "#F0FDF4",
        borderRadius: 12,
        padding: 14,
        marginTop: 8,
        borderLeftWidth: 4,
        borderLeftColor: "#10B981",
    },
    insightText: {
        fontSize: 14,
        color: "#065F46",
        lineHeight: 20,
    },
    warningBox: {
        flexDirection: "row",
        backgroundColor: "#FEF3C7",
        borderRadius: 12,
        padding: 14,
        marginTop: 8,
        gap: 10,
        borderLeftWidth: 4,
        borderLeftColor: "#F59E0B",
    },
    warningText: {
        flex: 1,
        fontSize: 14,
        color: "#78350F",
        lineHeight: 20,
    },
    clusterCard: {
        backgroundColor: "#F9FAFB",
        borderRadius: 14,
        padding: 16,
        marginTop: 12,
        borderWidth: 2,
        borderColor: "#E5E7EB",
    },
    clusterHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 8,
    },
    clusterName: {
        fontSize: 16,
        fontWeight: "700",
        color: "#1F2937",
        flex: 1,
    },
    skillBadge: {
        backgroundColor: "#DBEAFE",
        paddingHorizontal: 12,
        paddingVertical: 4,
        borderRadius: 8,
    },
    skillBadgeText: {
        fontSize: 12,
        fontWeight: "700",
        color: "#1E40AF",
        textTransform: "capitalize",
    },
    clusterDescription: {
        fontSize: 14,
        color: "#6B7280",
        lineHeight: 20,
    },
    disclaimerText: {
        fontSize: 13,
        color: "#6B7280",
        fontWeight: "600",
        marginBottom: 12,
        fontStyle: "italic",
    },
    opportunitiesSection: {
        marginTop: 16,
    },
    opportunitiesTitle: {
        fontSize: 15,
        fontWeight: "700",
        color: "#1F2937",
        marginBottom: 10,
    },
    opportunityItem: {
        flexDirection: "row",
        alignItems: "flex-start",
        marginBottom: 8,
        gap: 10,
    },
    opportunityDot: {
        width: 6,
        height: 6,
        borderRadius: 3,
        backgroundColor: "#8B5CF6",
        marginTop: 7,
    },
    opportunityText: {
        flex: 1,
        fontSize: 14,
        color: "#374151",
        lineHeight: 20,
    },
    disclaimerBox: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: "#FEE2E2",
        borderRadius: 12,
        padding: 14,
        marginBottom: 16,
        gap: 10,
        borderLeftWidth: 4,
        borderLeftColor: "#DC2626",
    },
    disclaimerBoldText: {
        flex: 1,
        fontSize: 14,
        fontWeight: "700",
        color: "#991B1B",
    },
    domainScoreCard: {
        backgroundColor: "#F9FAFB",
        borderRadius: 14,
        padding: 16,
        marginTop: 12,
        borderWidth: 1,
        borderColor: "#E5E7EB",
    },
    domainName: {
        fontSize: 15,
        fontWeight: "700",
        color: "#1F2937",
        marginBottom: 12,
    },
    scoreRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        gap: 8,
    },
    scoreItem: {
        flex: 1,
        alignItems: "center",
    },
    scoreLabel: {
        fontSize: 11,
        color: "#6B7280",
        marginBottom: 4,
        fontWeight: "600",
        textTransform: "uppercase",
    },
    scoreValue: {
        fontSize: 18,
        fontWeight: "700",
        color: "#1F2937",
    },
    parentClusterCard: {
        backgroundColor: "#F9FAFB",
        borderRadius: 14,
        padding: 18,
        marginTop: 12,
        borderWidth: 2,
        borderColor: "#E5E7EB",
    },
    parentClusterName: {
        fontSize: 16,
        fontWeight: "700",
        color: "#1F2937",
        marginBottom: 6,
    },
    parentClusterDesc: {
        fontSize: 14,
        color: "#6B7280",
        marginBottom: 10,
        lineHeight: 20,
    },
    parentSkillLevel: {
        fontSize: 14,
        color: "#374151",
        marginBottom: 10,
    },
    parentOpportunitiesTitle: {
        fontSize: 14,
        fontWeight: "700",
        color: "#1F2937",
        marginBottom: 8,
    },
    parentOpportunityText: {
        fontSize: 13,
        color: "#4B5563",
        lineHeight: 20,
        marginBottom: 4,
    },
    supportItem: {
        marginBottom: 16,
    },
    supportTitle: {
        fontSize: 15,
        fontWeight: "700",
        color: "#1F2937",
        marginBottom: 8,
    },
    supportText: {
        fontSize: 14,
        color: "#4B5563",
        lineHeight: 22,
    },
    actionButtons: {
        flexDirection: "row",
        gap: 12,
        marginBottom: 24,
    },
    actionButton: {
        flex: 1,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "#FFFFFF",
        borderRadius: 14,
        padding: 16,
        gap: 8,
        borderWidth: 2,
        borderColor: "#8B5CF6",
    },
    actionButtonText: {
        fontSize: 14,
        fontWeight: "700",
        color: "#8B5CF6",
    },
});
