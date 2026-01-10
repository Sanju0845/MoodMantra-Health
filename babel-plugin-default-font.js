module.exports = function () {
    return {
        name: "transform-default-font",
        visitor: {
            JSXOpeningElement(path) {
                const name = path.node.name.name;
                if (name === 'Text' || name === 'TextInput') {
                    const attributes = path.node.attributes;
                    const hasStyle = attributes.some(
                        attr => attr.name && attr.name.name === 'style'
                    );

                    if (!hasStyle) {
                        const t = this.types;
                        const styleAttr = t.jsxAttribute(
                            t.jsxIdentifier('style'),
                            t.jsxExpressionContainer(
                                t.objectExpression([
                                    t.objectProperty(
                                        t.identifier('fontFamily'),
                                        t.stringLiteral('Lora_400Regular')
                                    )
                                ])
                            )
                        );
                        attributes.push(styleAttr);
                    }
                }
            }
        }
    };
};
