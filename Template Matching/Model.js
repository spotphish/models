export default class TemplateMatching {
    constructor() {}
    async matchTemplates(scrFeatures, screenshot) {
        const scrCorners = scrFeatures.corners;
        const scrDescriptors = scrFeatures.descriptors;
        let t0 = performance.now();
        let activeTemplates = await readDB()
        if (!activeTemplates) {
            activeTemplates = []
        }
        console.log(activeTemplates);
        let max = 0;
        let result = null;
        for (let i = 0; i < activeTemplates.length; i++) {
            const template = activeTemplates[i];
            const res = matchOrbFeatures(scrCorners, scrDescriptors, template.patternCorners,
                template.patternDescriptors, template.site);
            if (res) {
                let t1 = performance.now();
                res.template = template;
                res.time_taken = (t1 - t0) / 1000;
                let corr_image = await this.makeCorrespondenceImage(res, screenshot, scrFeatures);
                res.image = corr_image;
                let confidence = res.goodMatches / res.ncorners;

                if (confidence > max) {
                    max = confidence;
                    result = res;
                }
            }
        }
        if (result == null) {
            result = {
                goodMatches: 0,
                ncorners: 0,
                template: {
                    site: "NaN"
                },
                time_taken: (performance.now() - t0) / 1000,
                image: screenshot
            }
        }
        return Promise.resolve(result);
    }
    makeCorrespondenceImage(match, screenshot, features) {
        if (!match) {
            return Promise.resolve(null);
        }
        return findCorrespondence(screenshot, features.corners, match.template, match.matches, match.matchCount,
            match.mask);
    }
    async saveModel() {
        openDB()
        setTimeout(() => {
            fetch(ROOT_DIR + "/Template Matching/model/templates.json")
                .then(res => res.json())
                .then(async sites => {
                    for (let site of sites) {
                        for (let template of site.templates) {
                            try {
                                let x = await createPatterns(template.image)

                                template = {
                                    ...template,
                                    ...x,
                                    site: site.name
                                }
                                console.log(template);
                                writeDB(template)
                            } catch (e) {
                                console.log(e);
                            }

                        }

                    }

                })
        }, 1000);

    }
    async predict(screenshot) {
        console.log("latest version")
        let features = await findOrbFeatures(screenshot);
        let match = await this.matchTemplates(features, screenshot);
        let result = {
            site: match.template.site,
            confidence: (match.goodMatches / match.ncorners) * 100,
            time_taken: match.time_taken,
            image: match.image
        }
        return result;
    }

}
TemplateMatching.dependencies = [
    ROOT_DIR + "/Template Matching/jsfeat.js",
    ROOT_DIR + "/Template Matching/orb-features.js",
    ROOT_DIR + "/Template Matching/database.js"

]