const { ConcurrentProcessor } = require("../index");

async function execute() {
    const startTime = new Date();
    const concurrentNums = [10, 100, 200, 300]; // number of concurrency to be compared
    const ROUND = 5; // for each concurrency run the test 5 round then get the mean duration
    const NUM_OF_TASK = 100_000;
    const results = [];

    for (let index = 0; index < concurrentNums.length; index++) {
        let iter = 0;
        let durations = [];

        while (iter < ROUND) {
            const processor = new ConcurrentProcessor(
                {
                    execution: async () => {
                        new Promise((res) => {
                            setTimeout(() => {
                                res();
                            }, 100_000);
                        });
                    }
                },
                {
                    maxConcurrent: concurrentNums[index]
                }
            );

            [...Array(NUM_OF_TASK).keys()].forEach((num) => {
                processor.add(num);
            });

            const duration = await processor.wait();
            durations.push(duration);

            iter++;
        }

        const result = {
            maxConcurrrent: concurrentNums[index],
            durations: durations.join(", "),
            avgDuration: durations.reduce((prev, next) => {
                return prev + next;
            }, 0) / ROUND
        };

        results.push(result);
    }

    console.table(results);
    console.log(`Test duration: ${new Date() - startTime}ms`);
}

execute().then(() => {
    process.exit(0);
});